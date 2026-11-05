importScripts('sites.js', 'i18n.js');

// Toolbar icon opens the batch submission page (or switches to it).
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('src/batch.html');
  const [page] = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] });
  if (page && page.tabId >= 0) {
    const tab = await chrome.tabs.update(page.tabId, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
});

// ---------------------------------------------------------------------------
// Batch submission queue, one site at a time.
// Automatic sites share one tab: a success navigates that same tab to the next site.
// Sites that stop for a person before Submit open their own tab and stay there, so those pages can be finished together.
// run = { active, productId, queue, siteId, laneTab, released, status, info, tabs }
// ---------------------------------------------------------------------------
const STALL_MS = 5 * 60 * 1000; // no progress for 5 minutes: failed
const WAIT_MS = 3 * 60 * 1000 + 30 * 1000; // waiting for you to pass a captcha or sign in (the page gives up after 3 minutes)
const t = (key, vars) => I18N.t(key, vars);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab && sender.tab.id;
  const handlers = {
    startRun: () => startRun(msg.productId, msg.ids),
    stopRun: () => withRun(stop),
    'runner:hello': () => isRunnerTab(msg.siteId, tabId),
    siteStatus: () => withRun((run) => onStatus(run, msg, tabId)),
    siteDone: () => withRun((run) => finishSite(run, msg.siteId, 'done', tabId, msg)),
    recordAttempt: () => withRun(async (run) => {
      if (run.siteId !== msg.siteId || !(run.tabs[msg.siteId] || []).includes(tabId)) return { ignored: true };
      await recordSubmission(run.productId, msg.siteId, {status:'attempted-unconfirmed', url:msg.url, submittedName:msg.submittedName || '', attemptedNames:msg.attemptedNames || []});
    }),
    siteFailed: () => withRun((run) => failSite(run, msg.siteId, msg.msg, msg.step)),
    markSite: () => withRun((run) => finishSite(run, msg.siteId, msg.result)),
    retrySite: () => withRun((run) => retrySite(run, msg.siteId)),
    focusSite: () => focusSite(msg.siteId),
    holdForHuman: () => withRun((run) => releaseForHuman(run, msg.siteId, tabId)),
    focusTab: () => focusTab(tabId),
    'runner:stubDialogs': () => stubDialogs(tabId),
    emailCode: () => emailCode(msg.siteId, msg.since),
    confirmEmail: () => confirmEmail(msg.siteId, msg.since, tabId),
  };
  const h = msg && handlers[msg.type];
  if (!h) return false;
  h().then(
    (r) => sendResponse(r || { ok: true }),
    (e) => sendResponse({ error: String(e) }),
  );
  return true;
});

// Serialize read-modify-write of `run` so concurrent messages don't overwrite each other.
let lock = Promise.resolve();
function withRun(fn) {
  const next = lock.then(async () => {
    const { run, settings } = await chrome.storage.local.get(['run', 'settings']);
    if (settings && settings.lang) I18N.setLang(settings.lang);
    if (!run) return { error: t('bNoRun') };
    run.status = run.status || {};
    run.info = run.info || {};
    run.tabs = run.tabs || {};
    const result = await fn(run);
    await chrome.storage.local.set({ run });
    return result;
  });
  lock = next.catch(() => {});
  return next;
}

async function clearDone(ids) {
  const { done = {} } = await chrome.storage.local.get('done');
  ids.forEach((id) => delete done[id]);
  await chrome.storage.local.set({ done });
}

// The page runner acts only in the tabs the queue opened for the current site (siteId null: a Google sign-in
// page asking on behalf of whichever site is being processed).
function needsOwnTab(site) {
  return !!(site && (site.reviewBeforeSubmit || (site.humanFields || []).length || (site.humanChallenges || []).length));
}

async function isRunnerTab(siteId, tabId) {
  const { run } = await chrome.storage.local.get('run');
  const id = siteId || (run && run.siteId);
  if (!run || !id || !tabId) return { mine: false, siteId: id };
  const tabs = ((run.tabs || {})[id]) || [];
  const running = run.status?.[id] === 'running';
  const mine = tabs.includes(tabId) && running && (run.siteId === id || !!run.released?.[id]);
  return { mine, siteId: id };
}

// Native alert() / confirm() freeze the page (and the runner with it). Before a submit, swap them in the page's own
// world for versions that note the message on <html data-autosubmit-alert> (confirm answers OK).
async function stubDialogs(tabId) {
  if (!tabId) return { ok: false };
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => {
      const note = (m) => document.documentElement.setAttribute('data-autosubmit-alert', String(m == null ? '' : m));
      window.alert = (m) => { note(m); };
      window.confirm = (m) => { note(m); return true; };
    },
  });
  return { ok: true };
}

// Sign-in popups (Google OAuth) opened from a site's tab belong to that site.
chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.openerTabId) return;
  withRun((run) => {
    const id = run.siteId;
    if (run.active && id && (run.tabs[id] || []).includes(tab.openerTabId) && !run.tabs[id].includes(tab.id)) run.tabs[id].push(tab.id);
  }).catch(() => {});
});

async function openSite(run, id) {
  const site = siteById(id);
  run.siteId = id;
  run.status[id] = 'running';
  run.info[id] = { step: '', msg: t('bOpened'), level: '', t: Date.now() };
  if (!needsOwnTab(site) && run.laneTab) {
    try {
      await chrome.tabs.get(run.laneTab);
      const tab = await chrome.tabs.update(run.laneTab, { url: site.url, active: true });
      run.tabs[id] = [tab.id];
      return;
    } catch (e) {
      run.laneTab = null;
    }
  }
  const tab = await chrome.tabs.create({ url: site.url, active: true });
  run.tabs[id] = [tab.id];
  if (!needsOwnTab(site)) run.laneTab = tab.id;
}

// The form is filled and waiting for a person to click Submit. Leave this tab open and continue the queue.
async function releaseForHuman(run, siteId, tabId) {
  if (!run.active || run.siteId !== siteId) return { ignored: true };
  if (tabId && !(run.tabs[siteId] || []).includes(tabId)) return { ignored: true };
  if (run.released?.[siteId]) return { ok: true };
  run.released = { ...(run.released || {}), [siteId]: true };
  const info = run.info[siteId] || {};
  run.info[siteId] = { ...info, level: 'wait', t: Date.now(), waitingSince: null };
  if (run.laneTab && (run.tabs[siteId] || []).includes(run.laneTab)) run.laneTab = null;
  await nextSite(run);
}

async function startRun(productId, ids) {
  ids = [...new Set((ids || []).filter(siteById))];
  if (!ids.length) return { error: t('bPickSites') };
  const { products = [] } = await chrome.storage.local.get('products');
  if (!products.some((p) => p.id === productId)) return { error: t('bPickProduct') };
  await clearDone(ids);
  const run = {
    active: true,
    productId,
    queue: ids,
    siteId: null,
    laneTab: null,
    released: {},
    status: Object.fromEntries(ids.map((id) => [id, 'pending'])),
    info: {},
    tabs: {},
  };
  // Write the run before opening the tab, so the page runner sees it as soon as it loads.
  run.siteId = ids[0];
  run.status[ids[0]] = 'running';
  await chrome.storage.local.set({ run });
  await withRun((r) => openSite(r, ids[0]));
  return { ok: true };
}

function stop(run) {
  run.active = false;
  if (run.siteId && run.status[run.siteId] === 'running') run.status[run.siteId] = 'pending';
  run.siteId = null;
}

function onStatus(run, msg, tabId) {
  if (!run.active || run.siteId !== msg.siteId) return { ignored: true };
  const tabs = (run.tabs[msg.siteId] = run.tabs[msg.siteId] || []);
  if (tabId && !tabs.includes(tabId)) return { ignored: true };
  run.info[msg.siteId] = { step: msg.step, msg: msg.msg, level: msg.level, t: Date.now(), waitingSince: msg.waitingSince || null };
}

async function nextSite(run) {
  const id = run.queue.find((q) => run.status[q] === 'pending');
  if (!id) {
    run.active = false;
    run.siteId = null;
    return;
  }
  await openSite(run, id);
}

// Record the submission on the product, like ticking "Mark as submitted" in the panel.
async function markSubmitted(productId, siteId) {
  const site = siteById(siteId);
  const { products = [] } = await chrome.storage.local.get('products');
  const p = products.find((x) => x.id === productId);
  if (!p || !site) return;
  p.submissions = { ...(p.submissions || {}), [site.domain]: Date.now() };
  await chrome.storage.local.set({ products });
}

async function recordSubmission(productId, siteId, result) {
  const site = siteById(siteId);
  if (!site) return;
  const { products = [] } = await chrome.storage.local.get('products');
  const p = products.find(x => x.id === productId);
  if (!p) return;
  p.submissionRecords = { ...p.submissionRecords, [site.domain]: {
    ...p.submissionRecords?.[site.domain], at: Date.now(), submitUrl: site.url, protocol: site.protocol || null, ...result,
  } };
  await chrome.storage.local.set({ products });
}

// Failed: keep the tab open for a look and move on to the next site.
async function failSite(run, siteId, reason, step) {
  if (!run.active || run.siteId !== siteId) return { ignored: true };
  run.info[siteId] = { step: step || (run.info[siteId] || {}).step || '', msg: reason, level: 'err', t: Date.now() };
  return finishSite(run, siteId, 'failed');
}

// result: done (close the tabs) / failed (keep them)
async function finishSite(run, siteId, result, tabId, receipt = {}) {
  if (!run.status[siteId] || run.status[siteId] === 'done' || run.status[siteId] === result) return { ignored: true };
  if (tabId && !(run.tabs[siteId] || []).includes(tabId)) return { ignored: true };
  run.status[siteId] = result;
  run.doneAt = { ...(run.doneAt || {}), [siteId]: Date.now() };
  const info = run.info[siteId] || {};
  run.info[siteId] = {
    ...info,
    msg: result === 'done' ? (info.level === 'ok' ? info.msg : t('bDone')) : info.msg || t('bMarkedFailed'),
    level: result === 'done' ? 'ok' : 'err',
    t: Date.now(),
    waitingSince: null,
  };
  if (result === 'done') {
    await recordSubmission(run.productId, siteId, {status: /has been added to the directory/i.test(receipt.receipt || '') ? 'listed' : 'submitted', message: receipt.receipt || info.msg || '', url: receipt.url || '',
      ...(receipt.submittedName ? {submittedName:receipt.submittedName} : {}), ...(receipt.attemptedNames ? {attemptedNames:receipt.attemptedNames} : {})});
    await markSubmitted(run.productId, siteId);
    const keep = run.laneTab && (run.tabs[siteId] || []).includes(run.laneTab) ? run.laneTab : null;
    for (const id of run.tabs[siteId] || []) if (id !== keep) chrome.tabs.remove(id).catch(() => {});
    run.tabs[siteId] = keep ? [keep] : [];
  } else if (run.laneTab && (run.tabs[siteId] || []).includes(run.laneTab)) {
    run.laneTab = null;
  }
  if (run.active && run.siteId === siteId) await nextSite(run);
}

// Retry: reopen the site; restart the queue if it had finished.
async function retrySite(run, siteId) {
  if (!run.status[siteId]) return { ignored: true };
  await clearDone([siteId]);
  for (const id of run.tabs[siteId] || []) chrome.tabs.remove(id).catch(() => {});
  run.tabs[siteId] = [];
  run.status[siteId] = 'pending';
  run.info[siteId] = { step: '', msg: t('bRetrying'), level: '', t: Date.now() };
  if (run.siteId === siteId) run.siteId = null;
  if (!run.active || !run.siteId) {
    run.active = true;
    await nextSite(run);
  }
}

// Bring a tab to the front of its window. Some sites only render their dialogs when the page is on screen
// (a hidden tab gets no animation frames), so the runner asks for this before opening one.
async function focusTab(tabId) {
  if (!tabId) return { error: t('bTabClosed') };
  try {
    const tab = await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    return { ok: true };
  } catch (e) {
    return { error: t('bTabClosed') };
  }
}

async function focusSite(siteId) {
  const { run } = await chrome.storage.local.get('run');
  const tabs = (run && run.tabs[siteId]) || [];
  for (const id of tabs.slice().reverse()) {
    const res = await focusTab(id);
    if (res.ok) return res;
  }
  return { error: t('bTabClosed') };
}

// You closed the site's tab.
chrome.tabs.onRemoved.addListener((tabId) => {
  withRun((run) => {
    for (const [id, tabs] of Object.entries(run.tabs || {})) {
      if (!tabs.includes(tabId)) continue;
      run.tabs[id] = tabs.filter((x) => x !== tabId);
      if (run.active && run.siteId === id && !run.tabs[id].length) return failSite(run, id, t('bTabClosed'));
    }
  }).catch(() => {});
});

// Stuck for too long (nobody solving the captcha, nothing to do on the page): failed, next site.
chrome.alarms.create('watchdog', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'watchdog') return;
  withRun((run) => {
    const id = run.siteId;
    if (!run.active || !id) return;
    const info = run.info[id] || {};
    if (info.waitingSince) {
      if (Date.now() - info.waitingSince > WAIT_MS) return failSite(run, id, t('bWaitTimeout'));
      return;
    }
    if (Date.now() - (info.t || 0) > STALL_MS) return failSite(run, id, t('bStalled'));
  }).catch(() => {});
});

// ---------------------------------------------------------------------------
// Codes and confirmation links from Gmail
// Reads the Gmail signed in to this Chrome (mail to the submission email is forwarded there),
// searching by the site's domain and the account email, and only trusts mail newer than the request.
// Gmail is opened in a background tab, where innerText is empty, so the page code reads textContent.
// ---------------------------------------------------------------------------
const GMAIL = 'https://mail.google.com/mail/u/0/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function accountEmail(run) {
  const { submitter = {}, products = [] } = await chrome.storage.local.get(['submitter', 'products']);
  const p = products.find((x) => run && x.id === run.productId) || {};
  return String(submitter.email || p.email || '').replace(/["\\\s]/g, '');
}

// Search by recipient (a domain keyword misses senders like "Active Search Results"), then keep the rows
// whose sender or subject names the site.
async function gmailQuery(siteId, since) {
  const { run } = await chrome.storage.local.get('run');
  const email = await accountEmail(run);
  const site = siteById(siteId);
  const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  // Forwarding can preserve To, Delivered-To or only a quoted original recipient. Match all three,
  // then require the site identity too. Never take an unrelated service's OTP from the same inbox.
  const keys = [...new Set([norm(site.name), norm(site.domain.split('.')[0]), norm(site.domain)])]
    .filter((k) => k.length > 2);
  const recipient = email ? ` {to:${email} deliveredto:${email} "${email}"}` : '';
  const identity = ` {from:${site.domain} "${site.domain}" "${site.name.replace(/["\\]/g, '')}"}`;
  const after = Number.isFinite(since) ? ` after:${Math.floor(since / 1000)}` : '';
  // Forwarded verification mail can land in Spam; keep recipient/site/time constraints intact.
  return { query: `in:anywhere newer_than:1d${after}${recipient}${identity}`, keys };
}

async function gmailSearch(gmailTab, query) {
  const url = `${GMAIL}#search/${encodeURIComponent(query)}`;
  if (!gmailTab.id) gmailTab.id = (await chrome.tabs.create({ url, active: false })).id;
  else await chrome.tabs.update(gmailTab.id, { url });
  await sleep(6000);
}

async function gmailExec(gmailTab, func, args) {
  const tab = await chrome.tabs.get(gmailTab.id);
  if (!/^https:\/\/mail\.google\.com\//.test(tab.url || '')) return { reason: t('bGmailSignedOut') };
  const [res] = await chrome.scripting.executeScript({ target: { tabId: gmailTab.id }, func, args });
  if (!res || res.result == null) return { reason: 'Gmail did not answer' };
  return res.result;
}

// Opens the newest email from the site and returns its links and text. Runs inside Gmail (no shared helpers).
function readNewestMail(since, keys) {
  return (async () => {
    const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const dated = (r) => {
      const el = r.querySelector('td.xW span[title]');
      return el ? Date.parse(el.getAttribute('title')) || 0 : 0;
    };
    const rows = [...document.querySelectorAll('tr.zA')]
      .sort((a, b) => dated(b) - dated(a));
    // The site usually names itself in the sender or the subject; forwarded mail keeps that text.
    const named = rows.filter((r) => keys.some((k) => norm(r.textContent).includes(k)));
    const freshNamed = named.filter((r) => !dated(r) || dated(r) >= since);
    const row = freshNamed[0];
    if (!row) return { reason: 'no matching email yet' };
    const when = dated(row);
    if (when && when < since) return { reason: 'newest email is older than this request' };
    const preview = row.textContent.replace(/\s+/g, ' ');
    row.click();
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const bodies = [...document.querySelectorAll('div[role=main] .a3s')];
      // A conversation lists messages oldest first: only the last one counts.
      const body = bodies[bodies.length - 1];
      if (!body) continue;
      const links = [...body.querySelectorAll('a[href]')].map((a) => ({ text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.href }));
      return { preview, text: body.textContent.replace(/\s+/g, ' ').trim(), links };
    }
    return { preview, reason: 'email body did not load' };
  })();
}

// The code sits next to the word "code" in most mails; take the first candidate that holds a digit.
function pickCode(mail) {
  const text = `${mail.preview || ''} ${mail.text || ''}`;
  const hits = [];
  for (const m of text.matchAll(/(?:code|otp|pin|验证码|verification)[^A-Za-z0-9]{0,60}?([A-Za-z0-9]{4,8})\b/gi)) hits.push(m[1]);
  for (const m of text.matchAll(/\b([A-Za-z0-9]{4,8})\b[^A-Za-z0-9]{0,30}(?:is your|is the)\b[^.]{0,60}(?:code|otp|pin)/gi)) hits.push(m[1]);
  for (const m of text.matchAll(/\b(\d{6})\b/g)) hits.push(m[1]);
  return hits.find((h) => /\d/.test(h)) || null;
}

function pickLink(mail, site) {
  const re = /verify|confirm|activate|validate|magic|sign ?in|log ?in|continue|complete|approve|验证|确认|激活/i;
  const ok = (l) => /^https?:/.test(l.href) && !/unsubscribe|preferences|privacy|terms|help|support/i.test(`${l.text} ${l.href}`);
  const links = (mail.links || []).filter(ok);
  const own = (l) => {
    try {
      const host = new URL(l.href).hostname;
      return host === site.domain || host.endsWith(`.${site.domain}`) || (site.emailLinkHosts || []).includes(host);
    } catch (e) { return false; }
  };
  return (links.find((l) => own(l) && re.test(l.text)) || links.find((l) => own(l) && re.test(l.href)) ||
    links.find((l) => own(l) && site.emailLinkPattern?.test(l.href)) || {}).href || null;
}

// Every 15 seconds for up to 3 minutes; progress goes to the results table.
async function pollGmail(siteId, label, find) {
  const gmailTab = { id: null };
  let found = {};
  try {
    for (let t0 = Date.now(); !found.ok && Date.now() - t0 < 3 * 60 * 1000; ) {
      found = await find(gmailTab).catch((e) => ({ reason: String(e.message || e) }));
      if (found.ok) break;
      await withRun((run) => {
        if (run.active && run.siteId === siteId) {
          run.info[siteId] = { step: label, msg: t('bGmailRetry', { why: found.reason || '' }), level: '', t: Date.now() };
        }
      });
      await sleep(15000);
    }
  } finally {
    if (gmailTab.id) chrome.tabs.remove(gmailTab.id).catch(() => {});
  }
  return found;
}

async function emailCode(siteId, since) {
  const { query, keys } = await gmailQuery(siteId, since);
  const found = await pollGmail(siteId, t('sCode'), async (g) => {
    await gmailSearch(g, query);
    const mail = await gmailExec(g, readNewestMail, [since, keys]);
    const code = !mail.reason || mail.preview ? pickCode(mail) : null;
    return code ? { ok: true, code } : { reason: mail.reason || 'no code in the newest email' };
  });
  return found.ok ? { code: found.code } : { reason: found.reason };
}

async function confirmEmail(siteId, since, tabId) {
  const site = siteById(siteId);
  const { query, keys } = await gmailQuery(siteId, since);
  const found = await pollGmail(siteId, t('sCheckMail'), async (g) => {
    await gmailSearch(g, query);
    const mail = await gmailExec(g, readNewestMail, [since, keys]);
    const link = mail.links ? pickLink(mail, site) : null;
    return link ? { ok: true, link } : { reason: mail.reason || 'no confirmation link in the newest email' };
  });
  if (!found.ok) return { reason: found.reason };
  await withRun((run) => {
    if (run.active && run.siteId === siteId) run.info[siteId] = { step: t('sCheckMail'), msg: t('bOpenedLink'), level: '', t: Date.now() };
  });
  if (tabId) await chrome.tabs.update(tabId, { url: found.link, active: true });
  return { ok: true };
}
