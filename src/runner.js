// Batch submission runner. It only acts in the tab the batch queue opened for this site:
// find the submission form, fill it with the selected product, pick the free plan, submit, then report back.
// Progress goes to the batch page; nothing is shown on the site itself apart from field outlines.
(() => {
  if (window.top !== window || window.__autosubmitRunner) return;
  window.__autosubmitRunner = true;
  const E = self.AutoSubmitEngine;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (E && location.hostname === 'accounts.google.com') return googleSignIn();
  const site = siteForHost(location.hostname, location.pathname);
  if (!E || !site) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const shown = (el) => !!el && el.isConnected && el.getClientRects().length > 0 && E.isVisible(el);
  const textOf = (el) => (el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  // innerText is empty while the tab is in the background, so fall back to the text content.
  const pageText = () => (document.body && (document.body.innerText || document.body.textContent)) || '';
  const t = (key, vars) => I18N.t(key, vars);

  // Third-party sign-in buttons: never clicked by the runner.
  const SOCIAL_RE = /google|apple|github|facebook|microsoft|twitter|\bx\.com\b|\bwith x\b|linkedin|discord|saml|\bsso\b/i;
  const SUCCESS_RE = /thank you|thanks (for|!)|^thanks!?$|success(fully)?|submitted|submission (is |has been )?(received|complete)|received your|under review|pending (review|approval)|we('|’)ll (review|be in touch|get back)|has been (added|sent|received|created)|awaiting (review|approval)|in (the )?(review )?queue|(have been|has been|is now) (confirmed|activated|verified)|提交成功|已提交|感谢/i;
  const LOGIN_PATH_RE = /\/(log-?in|sign-?in|sign-?up|register|auth)(\/|$)/i;
  const PAY_RE = /checkout\.stripe\.com|\/checkout\b|\/pay(ment)?\b|paddle\.com|lemonsqueezy|creem\.io/i;
  const SUBMIT_RE = /^(submit|send|add|launch|list|publish|post|save|create|continue|next|get listed|提交|发布|下一步)/i;
  const AGREE_RE = /agree|accept|terms|privacy|consent|confirm (that|i)|同意|条款|隐私/i;
  // Captchas, Cloudflare checks and sign-ins are yours: check every 5 seconds, give up after 3 minutes.
  const HUMAN_POLL_MS = 5000;
  const HUMAN_WAIT_MS = 3 * 60 * 1000;
  const TYPEFORM_WAIT_MS = 10 * 60 * 1000;

  let state = { run: null, done: {}, product: null, submitter: {}, settings: { ...CONFIG.defaultSettings } };
  let tabOwned = false;
  let current = null;
  let running = null; // the step being executed (current is reset when the URL changes)
  let busy = false;
  let finished = false;
  let lastHref = '';
  let urlChangedAt = 0;
  let stepStartedAt = 0;
  let noStepReported = false;
  let cfWaiting = false;

  const mine = () => {
    const run = state.run;
    if (!tabOwned || !run || run.status?.[site.id] !== 'running') return false;
    return run.siteId === site.id || !!run.released?.[site.id];
  };
  const pageAge = () => Date.now() - urlChangedAt;
  const isDone = (key) => !!(state.done[site.id] || {})[key];
  const nameCandidates = () => [...new Set([state.product?.name, ...(state.product?.alternateNames || [])].filter(Boolean))];
  const submissionName = () => {
    const chosen = (state.done[site.id] || {}).nameVariant;
    return nameCandidates().includes(chosen) ? chosen : state.product?.name || '';
  };
  async function setDone(key, value = true) {
    const { done = {} } = await chrome.storage.local.get('done');
    const mineDone = { ...(done[site.id] || {}) };
    if (value === false) delete mineDone[key];
    else mineDone[key] = value;
    done[site.id] = mineDone;
    state.done = done;
    await chrome.storage.local.set({ done });
  }

  async function load() {
    const s = await chrome.storage.local.get(['run', 'done', 'products', 'submitter', 'settings']);
    const settings = s.settings || {};
    if (settings.lang) I18N.setLang(settings.lang);
    state = {
      run: s.run || null,
      done: s.done || {},
      product: (s.products || []).find((p) => s.run && p.id === s.run.productId) || null,
      submitter: s.submitter || {},
      settings: { ...CONFIG.defaultSettings, ...settings },
    };
  }

  // The queue tells us whether this tab is the one it opened for this site.
  async function checkOwner() {
    const res = await chrome.runtime.sendMessage({ type: 'runner:hello', siteId: site.id }).catch(() => null);
    tabOwned = !!(res && res.mine);
  }

  // level: '' info / 'warn' needs you / 'wait' waiting for a captcha or sign-in / 'ok' done
  function status(msg, level = '', waitingSince = null) {
    if (!mine()) return;
    const step = running || current;
    chrome.runtime.sendMessage({ type: 'siteStatus', siteId: site.id, step: step ? t(step.label) : '', msg, level, waitingSince }).catch(() => {});
  }

  function fail(reason) {
    if (!mine() || finished) return;
    finished = true;
    const step = running || current;
    chrome.runtime.sendMessage({ type: 'siteFailed', siteId: site.id, step: step ? t(step.label) : '', msg: reason }).catch(() => {});
  }

  function finish(msg) {
    if (!mine() || finished) return;
    // Sites that email a confirmation link after the form: open it from Gmail first.
    if (site.confirmEmail && !isDone('confirmAsked')) {
      finished = true;
      const since = ((state.done[site.id] || {}).submitted || {}).at || Date.now();
      setDone('confirmAsked', true).then(() => {
        status(t('bReadingMail'));
        return chrome.runtime.sendMessage({ type: 'confirmEmail', siteId: site.id, since: since - 60 * 1000 });
      }).then((res) => {
        if (res && res.ok) {
          finished = false; // the confirmation page reports the final result
          return;
        }
        finished = false;
        finish(t('bNoConfirm', { msg }));
      }).catch(() => {});
      return;
    }
    finished = true;
    status(msg ? t('bDoneWith', { msg }) : t('bDone'), 'ok');
    chrome.runtime.sendMessage({ type: 'siteDone', siteId: site.id, url: site.receiptUrl ? site.receiptUrl(location) : location.href, receipt: msg || '',
      submittedName: (state.done[site.id] || {}).lastSubmittedName || submissionName(),
      attemptedNames: (state.done[site.id] || {}).attemptedNames || [] }).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // Captchas and Cloudflare: wait for you, then carry on
  // ---------------------------------------------------------------------------
  function hasCaptcha() {
    if ($$('.cf-turnstile, input[name=cf-turnstile-response]').some((el) => shown(el) || shown(el.parentElement))) return true;
    return $$('iframe').some((f) => {
      const src = f.src || '';
      if (!/recaptcha|hcaptcha|challenges\.cloudflare\.com|turnstile/.test(src)) return false;
      if (/size=invisible/.test(src)) return false;
      return shown(f) && f.offsetHeight > 40;
    });
  }
  const captchaToken = () => $$('textarea[name=g-recaptcha-response], textarea[name=h-captcha-response], input[name=cf-turnstile-response]')
    .some((el) => el.value && el.value.length > 20);
  const needsHuman = () => (site.humanFields || []).some(sel => { const el = $(sel); return shown(el) && !String(el.value || '').trim(); }) ||
    (site.humanChallenges || []).some(sel => $$(sel).some(shown)) || (hasCaptcha() && !captchaToken());
  const isCfChallenge = () =>
    /just a moment|attention required|请稍候|稍等片刻/i.test(document.title) ||
    !!$('#challenge-stage, #challenge-running, #cf-challenge-running, form#challenge-form, #challenge-error-title');

  async function waitHuman(label) {
    const start = Date.now();
    while (needsHuman() || isCfChallenge()) {
      if (Date.now() - start > HUMAN_WAIT_MS) {
        fail(t('bCaptchaTimeout'));
        throw new Error('captcha timeout');
      }
      const sec = Math.round((Date.now() - start) / 1000);
      status(label ? t('bCaptchaThen', { label, sec }) : t('bCaptcha', { sec }), 'wait', start);
      await showTab();
      await sleep(HUMAN_POLL_MS);
    }
    if (Date.now() - start > 2500) status(t('bCaptchaPassed'));
  }

  // A hidden tab gets no animation frames, and some sites only mount their dialogs when the page is on screen
  // (BestofAI's sign-in box never appeared in a background window). Bring the tab to the front first.
  let lastFocus = 0;
  async function showTab() {
    if (document.visibilityState === 'visible') return;
    if (Date.now() - lastFocus < 15000) return; // don't fight the user for the window
    lastFocus = Date.now();
    await chrome.runtime.sendMessage({ type: 'focusTab' }).catch(() => {});
    await sleep(800);
  }

  // ---------------------------------------------------------------------------
  // Values for site.fill
  // ---------------------------------------------------------------------------
  function valueOf(key) {
    const p = state.product;
    const who = state.submitter;
    const a = CONFIG.address;
    let origin = p.url;
    try { origin = new URL(p.url).origin; } catch (e) {}
    const values = {
      name: submissionName(),
      url: p.url,
      rootUrl: origin,
      heroUrl: p.heroUrl,
      email: p.email || who.email,
      tagline: p.tagline || p.description,
      launchHeadline: `${submissionName()} using AI`,
      description: p.description || p.tagline,
      namedDescription: [submissionName(), p.description || p.tagline].filter(Boolean).join('\n\n'),
      discoverySource: 'Directory submission list.',
      longDescription: p.longDescription || p.description || p.tagline,
      pricingNote: p.pricing === 'Free Trial' ? 'The product offers a free trial.' : (p.pricing ? `Product pricing model: ${p.pricing}.` : ''),
      pricing: p.pricing,
      tags: (p.tags || []).join(', '),
      marketingJobs: (p.tags || []).slice(0, 3).join(', '),
      features: p.features || (p.tags || []).join('\n'),
      useCases: p.useCases || (p.tags || []).join('\n'),
      firstName: who.firstName,
      lastName: who.lastName,
      fullName: [who.firstName, who.lastName].filter(Boolean).join(' ') || p.name,
      street: a.street,
      city: a.city,
      state: a.state,
      zip: a.zip,
      country: p.country || a.country,
      legalName: p.legalName,
      phone: a.phone,
      contactSubject: `Tool submission: ${p.name}`,
      contactMessage: [
        `Hi, I'd like to submit ${p.name} to ${site.name}.`,
        `URL: ${p.url}`,
        p.tagline,
        p.description,
        p.pricing ? `Product pricing: ${p.pricing}` : '',
        (p.tags || []).length ? `Tags: ${p.tags.join(', ')}` : '',
        'Please consider a free listing only, without a required reciprocal link. Do not enroll us in a paid package.',
        'Thanks!',
      ].filter(Boolean).join('\n\n'),
    };
    return values[key] || '';
  }

  // Some forms only enable their button after a real click into a field (Brownbook's sign-up): press it first.
  function touch(el) {
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
  }

  function setField(el, value) {
    if (!el || !value) return false;
    if (el.tagName !== 'SELECT') touch(el);
    if (el.tagName === 'SELECT') {
      const o = [...el.options].find((x) => x.text.trim().toLowerCase() === String(value).toLowerCase());
      if (!o) return false;
      E.setNativeValue(el, o.value);
    } else if (el.isContentEditable) E.setRichValue(el, value);
    else E.setNativeValue(el, E.fitLength(el, value));
    E.highlight(el);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Finding the form and its buttons
  // ---------------------------------------------------------------------------
  // The site's form selector, or the form with the most fields we understand, as long as it asks for a URL.
  function findForm() {
    if (site.form) {
      const f = $$(site.form).find(shown);
      if (f) return f;
    }
    const groups = new Map();
    for (const field of E.collectFields()) {
      if (field.kind === 'check' || field.kind === 'file') continue;
      if ((site.skip || []).some((sel) => field.el.matches(sel))) continue;
      const key = E.classify(field, E.describe(field.el), { submitter: state.submitter });
      if (!key) continue;
      const root = field.el.closest('form') || field.el.closest('[role=dialog]') || document.body;
      if (!groups.has(root)) groups.set(root, new Set());
      groups.get(root).add(key);
    }
    let best = null;
    let score = 0;
    for (const [root, keys] of groups) {
      if (!keys.has('url')) continue;
      if (keys.size > score) { best = root; score = keys.size; }
    }
    return best;
  }

  const clickables = (root = document) => $$('button, input[type=submit], input[type=button], [role=button], a[href], label', root).filter(shown);

  function findSubmit(root) {
    if (site.findSubmit) return site.findSubmit(makeCtx(), root || document);
    const scope = root && root !== document.body ? root : document;
    if (site.submit) {
      if (typeof site.submit === 'string') return $$(site.submit).find(shown) || null;
      // Buttons inside the form first: the nav often has a "Submit" link too.
      const buttons = (r) => $$('button, input[type=submit], [role=button]', r).filter(shown);
      return buttons(scope).find((b) => site.submit.test(textOf(b))) || buttons(document).find((b) => site.submit.test(textOf(b))) || null;
    }
    const btns = $$('button, input[type=submit], [role=button]', scope)
      .filter((b) => shown(b) && !SOCIAL_RE.test(textOf(b)));
    return btns.find((b) => (b.type || '').toLowerCase() === 'submit' && SUBMIT_RE.test(textOf(b))) ||
      btns.find((b) => SUBMIT_RE.test(textOf(b))) ||
      btns.find((b) => (b.type || '').toLowerCase() === 'submit') || null;
  }

  // Fields the browser won't let through (too short, wrong format…), with its own message.
  function invalidFields(root) {
    const scope = root && root !== document.body ? root : document;
    return $$('input, textarea, select', scope)
      .filter((el) => shown(el) && el.willValidate && !el.validity.valid && !el.validity.valueMissing)
      .map((el) => `${(E.describe(el).direct || el.name).slice(0, 30)}: ${el.validationMessage}`);
  }

  // Required fields still empty after filling (category pickers and the like).
  function requiredEmpty(root) {
    const scope = root && root !== document.body ? root : document;
    return $$('input[required], textarea[required], select[required], [aria-required=true]', scope)
      .filter((el) => shown(el) && el.type !== 'hidden' && !(site.skip || []).some((sel) => el.matches(sel)))
      .filter((el) => (el.type === 'checkbox' || el.type === 'radio'
        ? !(el.type === 'checkbox' || !el.name ? el.checked : $$(`input[name="${CSS.escape(el.name)}"]`, scope).some((x) => x.checked))
        : !String(('value' in el ? el.value : el.textContent) || '').trim()))
      .map((el) => {
        const d = E.describe(el);
        return (d.direct || d.ctx || el.name || el.type).slice(0, 40);
      });
  }

  const checkLabel = box => [...(box.labels || [])].map(l => l.textContent).join(' ') + ' ' + (box.getAttribute('aria-label') || '') + ' ' + box.name + ' ' + box.id;

  function agreeTerms(root) {
    const scope = root && root !== document.body ? root : document;
    for (const box of $$('input[type=checkbox]', scope)) {
      if (box.checked || !(shown(box) || (box.labels && [...box.labels].some(shown)))) continue;
      const label = checkLabel(box);
      if (AGREE_RE.test(label) && !/newsletter|subscribe|marketing|updates|backlink|reciprocal|badge|订阅|互链|反链|徽章/i.test(label)) box.click();
    }
  }

  // Options of a category list ranked by how well they match the product: word stems shared with the tags
  // (and, weaker, the tagline and name), with stems found in many options ("video") counting less.
  function rankOptions(opts) {
    const stems = (s) => [...new Set(String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2).map((w) => w.slice(0, 4)))];
    const weight = new Map();
    for (const w of stems(`${state.product.tagline} ${state.product.name}`)) weight.set(w, 1);
    for (const w of stems((state.product.tags || []).join(' '))) weight.set(w, 2);
    const optStems = opts.map((o) => stems(o.text));
    const df = new Map();
    optStems.flat().forEach((w) => df.set(w, (df.get(w) || 0) + 1));
    const score = optStems.map((ws) => ws.reduce((n, w) => n + (weight.get(w) || 0) / df.get(w), 0));
    return opts.map((o, i) => ({ o, s: score[i] })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.o);
  }

  // A required <select> nothing matched (usually the category): pick the option closest to the product.
  function fillRequiredSelects(root) {
    const scope = root && root !== document.body ? root : document;
    for (const sel of $$('select', scope)) {
      if (!shown(sel) || !sel.required || sel.value) continue;
      const opts = [...sel.options].filter((o) => o.value && !o.disabled);
      const pick = rankOptions(opts)[0];
      if (!pick) continue;
      E.setNativeValue(sel, pick.value);
      E.highlight(sel);
    }
  }

  // site.category = { select, count }: a picker that adds one category per choice (chips).
  async function pickCategories() {
    const { select, count = 1 } = site.category;
    const sel = $(select);
    if (!sel) return;
    for (const o of rankOptions([...sel.options].filter((x) => x.value && !x.disabled)).slice(0, count)) {
      E.setNativeValue(sel, o.value);
      await sleep(300);
    }
    E.highlight(sel);
  }

  const hasPrice = (text) => [...text.matchAll(/[$€£¥￥]\s*(\d[\d,]*(?:\.\d+)?)/g)]
    .some((m) => Number(m[1].replace(/,/g, '')) > 0);

  // Only listing plans, never the product's own Free/Freemium/Paid pricing model.
  function listingPlans(root) {
    return $$('input[type=radio], select, [role=radio]', root).filter((el) =>
      !(site.productPricing || []).some(sel => el.matches(sel)) &&
      (/plan|tier|package|placement|listing.?type|submission.?type|launch.?type/i.test(`${el.name || ''} ${el.id || ''} ${el.getAttribute('aria-label') || ''}`) ||
      (el.getAttribute('role') === 'radio' && /\b(free|basic|pro|premium)\b/i.test(textOf(el)))));
  }

  function blockedSubmission(root, btn) {
    if (PAY_RE.test(location.href)) return true;
    if (btn && (/^(pay\b|buy\b|purchase\b|checkout\b|upgrade\b|支付|付费|购买)/i.test(textOf(btn)) || hasPrice(textOf(btn)))) return true;
    for (const el of listingPlans(root)) {
      if (el.tagName === 'SELECT') {
        if (hasPrice(el.selectedOptions[0]?.text || '') || /^(paid|pro|premium|featured|sponsored)$/i.test(el.value)) return true;
      } else if (el.checked || el.getAttribute('aria-checked') === 'true') {
        const label = [...(el.labels || [])].map((l) => textOf(l)).join(' ') || textOf(el);
        if (hasPrice(label) || /^(paid|pro|premium|featured|sponsored)$/i.test(el.value || '')) return true;
      }
    }
    return $$('input[required], textarea[required], select[required], [aria-required=true]', root).some((el) => {
      // A required Yes/No answer is not a required backlink when the observed No option is selected.
      const no = site.optionalReciprocalNo && $(site.optionalReciprocalNo, root);
      if (el.type === 'radio' && no?.checked && el.name && el.name === no.name) return false;
      return shown(el) && /backlink|reciprocal|badge|互链|反链|友链|徽章/i.test(`${E.describe(el).all}`);
    });
  }

  async function pickFree(root) {
    const option = [...clickables(root), ...$$('[role=radio], [role=option]', root).filter(shown)]
      .find((b) => site.free.test(textOf(b)) && !hasPrice(textOf(b)));
    if (!option) return false;
    const radio = option.matches('input') ? option : $('input[type=radio]', option) || (option.htmlFor && document.getElementById(option.htmlFor));
    if ((radio && radio.checked) || option.getAttribute('aria-checked') === 'true') return true;
    (radio || option).click();
    await sleep(600);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Success detection
  // ---------------------------------------------------------------------------
  // Short lines that read like a confirmation; FAQ questions ("…submitted?") don't count.
  const successLines = () => `${document.documentElement.getAttribute('data-autosubmit-alert') || ''}\n${document.body.innerText || document.body.textContent || ''}`
    .split('\n').map((l) => l.trim())
    .filter((l) => l.length > 3 && l.length < 160 && !l.endsWith('?') && (site.success || SUCCESS_RE).test(l) && !/^no,? thanks/i.test(l));
  const newSuccess = (baseline) => successLines().find((l) => !(baseline || []).includes(l));

  const fieldSignature = (root) => E.collectFields(root && root !== document.body ? root : document)
    .filter((f) => f.kind !== 'check').map((f) => f.el.name || f.el.id || f.el.placeholder || f.kind).join('|');

  // ---------------------------------------------------------------------------
  // Filling and submitting
  // ---------------------------------------------------------------------------
  // A URL duplicate, generic validation error or missing receipt must never rename a product.
  const nameConflictLine = () => {
    const lines = pageText().split('\n').map(s => s.trim());
    // An existing URL takes precedence even if the response also reports a name conflict.
    if (lines.some(s => /^(?:website |product )?(?:url|domain|website|网址|域名)\s*[-:：]?\s*(?:has already been taken|is already (?:taken|in use|registered)|already (?:exists|listed)|has already been (?:submitted|registered|listed)|已存在|已被收录|重复)/i.test(s))) return;
    return lines.find(s =>
      /^(?:(?:product|tool|software|app)\s+)?name\s*[-:：]?\s*(?:has already been taken|is already (?:taken|in use)|already exists|is not available)[.!]?$/i.test(s) ||
      /^(?:产品|工具|软件)?名称\s*[-:：]?\s*(?:已被占用|已存在|重复|已被使用)[。！!]?$/i.test(s));
  };

  function nameField(root) {
    for (const [selector, key] of Object.entries(site.fill || {})) {
      if (key === 'name') { const el = $(selector, root); if (el && shown(el)) return el; }
    }
    return E.collectFields(root).find(f => f.kind === 'text' && shown(f.el) &&
      !Object.entries(site.fill || {}).some(([selector,key]) => key !== 'name' && f.el.matches(selector)) &&
      E.classify(f, E.describe(f.el), {submitter:state.submitter}) === 'name')?.el;
  }

  async function useBackupName(root) {
    if (!nameConflictLine()) return false;
    const input = nameField(root);
    // Only retry the name the plugin actually submitted; preserve other manual edits.
    if (!input || input.value?.trim() !== submissionName()) return false;
    const tried = new Set([...(state.done[site.id]?.attemptedNames || []), submissionName()]);
    const next = nameCandidates().find(name => !tried.has(name));
    if (!next) { status(t('bNameConflict'), 'warn'); return 'stop'; }
    await setDone('nameVariant', next);
    setField(input, next);
    await setDone('submitted', false);
    status(t('bNameFallback', {name:next}));
    current = null;
    return 'retry';
  }

  async function recordAttempt(root) {
    const name = nameField(root)?.value?.trim() || submissionName();
    const names = [...new Set([...(state.done[site.id]?.attemptedNames || []), name])];
    await setDone('lastSubmittedName', name);
    await setDone('attemptedNames', names);
    await chrome.runtime.sendMessage({type:'recordAttempt', siteId:site.id, url:location.href, submittedName:name, attemptedNames:names}).catch(() => {});
  }

  const holdsOurValues = (root) => E.collectFields(root && root !== document.body ? root : document)
    .some(({ el }) => el.value && [state.product.url, submissionName()].includes(el.value.trim()));

  async function fillAndSubmit(root) {
    let sub = (state.done[site.id] || {}).submitted;
    if (sub && nameConflictLine()) {
      const action = await useBackupName(root);
      if (action === 'stop') return;
      if (action === 'retry') sub = null;
    }
    if (sub && holdsOurValues(root) && (sub.href === location.href || sub.signature === fieldSignature(root))) {
      // Still on the filled form after submitting: the site rejected something.
      status(t('bFormAgain'), 'warn');
      watchManualSubmit(root, findSubmit(root));
      return;
    }
    if (sub) await setDone('submitted', false);
    await sleep(800); // let client-side forms hydrate
    if (!root.isConnected) root = findForm() || root;
    if (site.beforeFill) await site.beforeFill(makeCtx(), root);
    const filled = E.autofill({...state.product, name:submissionName()}, { root, skip: site.skip || [], submitter: state.submitter, overwrite: false });
    let count = filled.length;
    for (const [sel, key] of Object.entries(site.fill || {})) {
      const el = $(sel, root) || $(sel);
      if (setField(el, valueOf(key))) count++;
    }
    for (const sel of site.check || []) {
      const el = $(sel, root) || $(sel);
      if (el && !state.settings.autoAgree && AGREE_RE.test(checkLabel(el))) continue;
      if (el && !isChecked(el)) el.click();
    }
    if (site.afterFill) await site.afterFill(makeCtx(), root);
    if (state.settings.autoAgree) agreeTerms(root);
    if (site.category) await pickCategories();
    fillRequiredSelects(root);
    if (site.free && !(await pickFree(root)) && listingPlans(root).length) {
      status(t('bNoFree'), 'warn');
      return;
    }
    status(t('bFilled', { n: count }));
    await sleep(500);

    if (blockedSubmission(root, findSubmit(root))) return status(t('bFreeOnly'), 'warn');
    const missing = requiredEmpty(root);
    const invalid = [...invalidFields(root), ...(site.validate ? site.validate(makeCtx(), root) : [])];
    const btn = findSubmit(root);
    if (missing.length || invalid.length) {
      if (btn) E.highlight(btn);
      status(missing.length ? t('bMissing', { fields: missing.join(', ') }) : t('bInvalid', { fields: invalid.join('; ') }), 'warn');
      watchManualSubmit(root, btn);
      return;
    }
    await submit(root, btn);
  }

  // You finish the form yourself: once you press its submit button we watch for the result.
  const isDraftSubmit = (root, btn) => !!(site.draftSubmit?.test(textOf(btn)) || site.isDraftSubmit?.(makeCtx(), root, btn));
  function watchManualSubmit(root, btn) {
    if (btn && isDraftSubmit(root, btn)) {
      btn.addEventListener('click', () => {
        setDone('draftSteps', (state.done[site.id]?.draftSteps || 0) + 1).then(() => {setTimeout(() => { current = null; }, 1500);});
      }, {once:true});
      return;
    }
    chrome.runtime.sendMessage({ type: 'holdForHuman', siteId: site.id }).catch(() => {});
    let observed = false;
    const onSubmit = async () => {
      if (observed) return;
      observed = true;
      const baseline = successLines();
      await setDone('submitted', { at: Date.now(), href: location.href, baseline, signature:fieldSignature(root), nameConflict:nameConflictLine() || '' });
      await recordAttempt(root);
      watchResult(root, baseline, fieldSignature(root));
    };
    if (btn) btn.addEventListener('click', onSubmit, { once: true });
    if (root && root.tagName === 'FORM') root.addEventListener('submit', onSubmit, { once: true });
  }

  async function submit(root, btn) {
    if (blockedSubmission(root, btn)) {
      status(t('bFreeOnly'), 'warn');
      return;
    }
    if (!btn) {
      status(t('bNoSubmit'), 'warn');
      watchManualSubmit(root, null);
      return;
    }
    const label = textOf(btn).slice(0, 30) || 'Submit';
    if (!state.settings.autoSubmit || site.reviewBeforeSubmit || (site.protocol?.terms === 'submission-accepts' && !state.settings.autoAgree)) {
      E.highlight(btn);
      status(t('bReview', { label }), 'warn');
      watchManualSubmit(root, btn);
      return;
    }
    if (needsHuman()) {
      E.highlight(btn);
      await waitHuman(label);
    }
    const disabled = () => btn.disabled || btn.getAttribute('aria-disabled') === 'true';
    for (let i = 0; i < 40 && disabled(); i++) await sleep(500);
    if (disabled()) {
      E.highlight(btn);
      status(t('bDisabled', { label }), 'warn');
      watchManualSubmit(root, btn);
      return;
    }
    if (needsHuman()) await waitHuman(label);
    if (!btn.isConnected) return;
    if (blockedSubmission(root, btn)) return status(t('bFreeOnly'), 'warn');
    if (isDraftSubmit(root, btn)) {
      // Saving a draft is an intermediate page step, never a submission receipt or an uncertain final attempt.
      status(t('bClick', {label}));
      await setDone('draftSteps', (state.done[site.id]?.draftSteps || 0) + 1);
      btn.click();
      await sleep(1500);
      current = null;
      return;
    }
    const baseline = successLines();
    const signature = fieldSignature(root);
    await setDone('submitted', { at: Date.now(), href: location.href, baseline, signature, nameConflict:nameConflictLine() || '' });
    await recordAttempt(root);
    await chrome.runtime.sendMessage({ type: 'runner:stubDialogs' }).catch(() => {});
    // Forms that post into a new tab (ExactSeek) would leave the result where the queue can't see it.
    const form = btn.form || (root && root.tagName === 'FORM' ? root : null);
    if (form && form.target && form.target !== '_self') form.target = '_self';
    if (btn.getAttribute('formtarget')) btn.setAttribute('formtarget', '_self');
    status(t('bClick', { label }));
    btn.click();
    await watchResult(root, baseline, signature);
  }

  // After a click: a confirmation, the next step of a multi-step form, or validation errors.
  async function watchResult(root, baseline, signature) {
    const href = location.href;
    const nextStep = async () => {
      const step = ['step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8'].find((k) => !isDone(k));
      if (!step) return false;
      await setDone(step);
      await setDone('submitted', false);
      current = null;
      return true;
    };
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      if (finished || location.href !== href) return; // the next page's runner takes over
      const ok = newSuccess(baseline);
      if (ok) return finish(ok.slice(0, 80));
      const conflict = nameConflictLine();
      if (conflict && conflict !== state.done[site.id]?.submitted?.nameConflict) {
        if (await useBackupName(root)) return;
      }
      // The next step of a multi-step form appeared in place.
      if (i >= 2 && root.isConnected && shown(root) && fieldSignature(root) !== signature && (await nextStep())) return;
      if (needsHuman()) await waitHuman('');
      if (looksLikeLogin() || (site.steps || []).some((st) => { try { return st.match(); } catch (e) { return false; } })) {
        current = null; // the sign-in step or a site step (dialog after submitting) takes over
        return;
      }
    }
    const form = root.isConnected && shown(root) ? root : findForm();
    if (!form && !site.success) return finish(t('bFormGone'));
    if (!form) return status(t('bNoReceipt'), 'warn');
    if (fieldSignature(form) !== signature && (await nextStep())) return;
    status(t('bStuck'), 'warn');
    const watch = setInterval(() => {
      if (finished) return clearInterval(watch);
      const ok = newSuccess(baseline);
      if (ok) { clearInterval(watch); finish(ok.slice(0, 80)); }
    }, 1000);
  }

  // ---------------------------------------------------------------------------
  // Steps: site-specific ones first, then the generic flow
  // ---------------------------------------------------------------------------
  const passwordShown = () => $$('input[type=password]').some(shown);
  const loginCredentialError = () => pageText().split('\n').some(line => /(?:incorrect|invalid|wrong)\s+(?:email|password|credentials|username)|(?:email|password|credentials|username)\s+(?:is\s+)?(?:incorrect|invalid|wrong)|credentials (?:do not|don't) match|invalid login|authentication failed|密码错误|账号或密码错误|密码不正确/i.test(line));
  const accountEmail = () => state.submitter.email || state.product.email;
  const SIGNUP_PATH_RE = /\/(sign-?up|register|join|create-account)(\/|$)/i;
  const SIGNUP_BTN_RE = /^(sign ?up|register|create (an |my )?account|join|get started|create|注册)/i;
  const CODE_RE = /\b(code|otp|pin|token)\b|one.?time|验证码/i;
  const CODE_PAGE_RE = /(verification|confirmation|security|login|sign.?in|one.?time|\d.?digit) code|enter (the |your )?code|code (we )?sent|\bOTP\b|验证码/i;
  const CHECK_MAIL_RE = /check your (e-?mail|inbox)|verify your e-?mail|confirm your e-?mail|we('ve| have)? sent (you )?(a|an|the)? ?(link|e-?mail|magic link|verification|confirmation)|magic link (has been |was )?sent|查收|验证邮件/i;

  function codeInputs() {
    const boxes = $$('input').filter((el) => shown(el) && !/^(hidden|checkbox|radio|submit|button|password|email|file)$/.test(el.type));
    const single = boxes.filter((el) => el.maxLength === 1);
    if (single.length >= 4) return single;
    const one = boxes.find((el) => el.autocomplete === 'one-time-code' || CODE_RE.test(`${el.name} ${el.id} ${el.placeholder} ${el.getAttribute('aria-label') || ''}`));
    return one ? [one] : [];
  }

  function fillCode(inputs, code) {
    if (inputs.length > 1) {
      // One box per digit: type them, some components only react to key events.
      code.split('').forEach((ch, i) => {
        const el = inputs[i];
        if (!el) return;
        setField(el, ch);
        for (const type of ['keydown', 'keypress', 'keyup']) {
          el.dispatchEvent(new KeyboardEvent(type, { key: ch, code: ch, bubbles: true, cancelable: true }));
        }
      });
    } else setField(inputs[0], code);
  }

  const buttonIn = (scope, re) => $$('button, input[type=submit], [role=button]', scope).filter(shown)
    .find((b) => re.test(textOf(b)) && !SOCIAL_RE.test(textOf(b)));
  const socialShown = () => clickables().some((b) => /^(continue|sign in|log in|sign up) with (google|github|email|apple)|^login with (google|github)/i.test(textOf(b)));
  // A sign-in dialog can open on top of the form (sites that ask for an account only when you submit).
  const loginDialog = () => $$('[role=dialog], [aria-modal=true], dialog[open]').filter(shown).find((d) =>
    $$('input[type=password]', d).some(shown) ||
    $$('button, a, [role=button]', d).some((b) => shown(b) && /google|github|sign ?in|log ?in|登录/i.test(textOf(b))));
  // The e-mail field of the sign-in box: pages often carry a newsletter field of their own, so the box wins.
  const emailInput = () => {
    const sel = 'input[type=email], input[name*=email i], input[name=identifier], input[name=username]';
    const d = loginDialog();
    const inBox = d ? $$(sel, d).filter(shown) : [];
    return inBox[0] || $$(sel).filter(shown)[0] || null;
  };
  const looksLikeLogin = () => !!loginDialog() || !!(site.loginPrompt && site.loginPrompt.test(pageText())) ||
    ((LOGIN_PATH_RE.test(location.pathname) || passwordShown() || socialShown()) && !findForm());

  const GENERIC_STEPS = [
    {
      // A code from the email (sign-up or passwordless sign-in): read it from Gmail.
      id: 'code',
      label: 'sCode',
      match: () => codeInputs().length > 0 && CODE_PAGE_RE.test(pageText()) && !findForm(),
      async run() {
        if ((state.done[site.id] || {}).codeAsked === location.href) return status(t('bCodeAgain'), 'warn');
        await setDone('codeAsked', location.href);
        status(t('bReadingCode'));
        const res = await chrome.runtime.sendMessage({ type: 'emailCode', siteId: site.id, since: Date.now() - 5 * 60 * 1000 });
        if (!res || !res.code) return status(t('bNoCode', { why: (res && res.reason) || '' }), 'warn');
        status(t('bGotCode', { code: res.code }));
        await showTab(); // the code box may only render when the page is on screen
        const inputs = codeInputs();
        fillCode(inputs, res.code);
        await sleep(600);
        // Some providers sign in as soon as the final digit is entered. Do not click an unrelated
        // submit button on the destination page after the OTP controls have disappeared.
        if (!inputs[0]?.isConnected || !codeInputs().length) { current = null; return; }
        const btn = buttonIn(inputs[0].form || document, /^(verify|confirm|continue|submit|next|sign ?in|log ?in|done|验证|确认|继续)/i);
        if (btn && !btn.disabled) btn.click();
      },
    },
    {
      // "Check your inbox": open the confirmation / magic link from Gmail in this tab.
      id: 'checkMail',
      label: 'sCheckMail',
      match: () => CHECK_MAIL_RE.test(pageText()) && !codeInputs().length && !findForm(),
      async run() {
        if (isDone('mailAsked')) return status(t('bMailWaiting'), 'warn');
        await setDone('mailAsked', true);
        status(t('bReadingMail'));
        const res = await chrome.runtime.sendMessage({ type: 'confirmEmail', siteId: site.id, since: Date.now() - 5 * 60 * 1000 });
        if (!res || !res.ok) status(t('bNoMail', { why: (res && res.reason) || '' }), 'warn');
      },
    },
    {
      // Sign-up form (email + password): register with the submitter email and password.
      id: 'signup',
      label: 'sSignup',
      match: () => site.login === 'email' && !!state.submitter.password && !findForm() &&
        $$('input[type=password]').some(shown) &&
        (SIGNUP_PATH_RE.test(location.pathname) || $$('input[type=password]').filter(shown).length > 1 || $$('h1,h2,h3').some(h=>shown(h)&&/^(create (your |an |a )?account|sign ?up|register|注册)/i.test(textOf(h)))),
      async run() {
        const who = state.submitter;
        const pwds = $$('input[type=password]').filter(shown);
        const scope = pwds[0].form || pwds[0].closest('[role=dialog]') || document;
        const fields = E.collectFields(scope === document ? document : scope);
        for (const { el, kind } of fields) {
          if (kind !== 'text') continue;
          const d = E.describe(el);
          const key = E.classify({ el, kind }, d, { submitter: who });
          const label = `${d.direct} ${el.name}`;
          if (el.type === 'email' || key === 'email') setField(el, accountEmail());
          else if (/user ?name|handle|nickname/i.test(label)) setField(el, (state.product.name || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20));
          else if (['firstName', 'lastName', 'fullName'].includes(key)) setField(el, valueOf(key));
          else if (/\bname\b/i.test(label)) setField(el, valueOf('fullName') || state.product.name);
        }
        pwds.forEach((el) => setField(el, who.password));
        if (state.settings.autoAgree) agreeTerms(scope);
        await sleep(500);
        const btn = buttonIn(scope, SIGNUP_BTN_RE) || buttonIn(scope, /^(continue|submit|next)/i);
        if (!btn) return status(t('bNoSubmit'), 'warn');
        if (needsHuman()) await waitHuman(textOf(btn));
        await setDone('signup', true);
        status(t('bSigningUp', { email: accountEmail() }));
        btn.click();
        await sleep(5000);
      },
    },
    {
      id: 'pay',
      label: 'sPay',
      match: () => PAY_RE.test(location.href),
      async run() {
        fail(t('bFreeOnly'));
      },
    },
    {
      id: 'login',
      label: 'sLogin',
      match: () => looksLikeLogin(),
      async run() {
        // Signing in starts the form over, so a submission made before it doesn't count.
        await setDone('submitted', false);
        await showTab(); // the sign-in box only renders when the page is on screen
        const who = state.submitter;
        const email = emailInput();
        const pwd = $$('input[type=password]').find(shown);
        const loginKey = `as_login_${location.pathname}_${pwd ? 'password' : 'email'}`;
        const tried = sessionStorage.getItem(loginKey);
        // Google: press the site's Google button; the Google pages then pick the first account (googleSignIn).
        const google = clickables().find((b) => /^((sign|log) ?in|continue|sign ?up|login) with google$|^google$/i.test(textOf(b)));
        if (google && !(site.login === 'email' && (email || (pwd && who.password))) && !site.emailOnly && state.settings.googleAuto !== false && !sessionStorage.getItem(`as_google_${location.pathname}`)) {
          sessionStorage.setItem(`as_google_${location.pathname}`, '1');
          status(t('bGoogleClick'));
          google.click();
          await sleep(5000);
        }
        if (site.login === 'email' && (email || pwd) && !tried && (pwd ? who.password : true)) {
          sessionStorage.setItem(loginKey, '1');
          if (email) setField(email, accountEmail());
          if (pwd) setField(pwd, who.password);
          const scope = (pwd || email).form || (pwd || email).closest('[role=dialog]') || document;
          const btn = buttonIn(scope, /^(log ?in|sign ?in|continue|submit|next|send|get (a |the )?(link|code)|email me|登录|继续)/i);
          if (btn) {
            if (site.protocol?.terms === 'auth-accepts' && !state.settings.autoAgree) {
              E.highlight(btn);
              return status(t('bReview', {label:textOf(btn)}), 'warn');
            }
            if (needsHuman()) await waitHuman(textOf(btn));
            status(pwd ? t('bLoggingIn') : t('bSendingLink', { email: accountEmail() }));
            btn.click();
            await sleep(5000);
          }
          if (looksLikeLogin() && loginCredentialError()) return status(t('bLoginFailed'), 'warn');
          // A wrong password is not evidence that the account is missing.
          if (pwd && who.password && looksLikeLogin() && !isDone('signup') && pageText().split('\n').some(line=>/^(?:no account (?:found|exists)(?: for .*)?|account (?:does not|doesn't) exist|user not found|could(?:n't| not) find your account|账号不存在|尚未注册)[.!。]?$/i.test(line.trim()))) {
            const join = clickables().find((b) => /^(sign ?up|register|create (an )?account|join)/i.test(textOf(b)) && !SOCIAL_RE.test(textOf(b)));
            if (join) {
              status(t('bToSignup'));
              join.click();
              await sleep(2500);
              current = null;
              return;
            }
          }
        }
        const start = Date.now();
        const href = location.href;
        while (looksLikeLogin() && location.href === href) {
          if (loginCredentialError()) return status(t('bLoginFailed'), 'warn');
          // Some sites replace the email field with a password field without changing the URL.
          if (site.login === 'email' && who.password && $$('input[type=password]').some(shown) && !sessionStorage.getItem(`as_login_${location.pathname}_password`)) {
            current = null;
            return;
          }
          // Email providers commonly replace the email box with an OTP without navigating.
          // Release this login step so the code / check-mail step can run on the same URL.
          if ((codeInputs().length && CODE_PAGE_RE.test(pageText())) || CHECK_MAIL_RE.test(pageText())) {
            current = null;
            return;
          }
          if (Date.now() - start > HUMAN_WAIT_MS) return fail(t('bLoginTimeout'));
          const how = site.login === 'oauth' ? t('loginOauth') : t('loginEmail');
          const sec = Math.round((Date.now() - start) / 1000);
          status(t('bLogin', { site: site.name, how, sec }), 'wait', start);
          await sleep(HUMAN_POLL_MS);
        }
        if (location.href === href) {
          status(t('bLoggedIn'));
          current = null;
        }
      },
    },
    {
      id: 'form',
      label: 'sForm',
      match: () => !!findForm(),
      run: () => fillAndSubmit(findForm()),
    },
    {
      // "Sign in to continue" / "Go to Sign In" instead of the form.
      id: 'gate',
      label: 'sLogin',
      match: () => !findForm() && pageAge() > 2500 && !!signInGate(),
      async run() {
        const link = signInGate();
        status(t('bOpenForm', { label: textOf(link).slice(0, 30) }));
        link.click();
        await sleep(2500);
        current = null;
      },
    },
    {
      // A button that opens the form ("Add Tool", "Start your listing").
      id: 'start',
      label: 'sStart',
      match: () => site.start && pageAge() > 2500 && clickables().some((b) => site.start.test(textOf(b))),
      async run() {
        const btn = clickables().find((b) => site.start.test(textOf(b)) && !SOCIAL_RE.test(textOf(b)));
        if (!btn) return;
        status(t('bOpenForm', { label: textOf(btn).slice(0, 30) }));
        await showTab(); // the dialog it opens only renders when the page is on screen
        btn.click();
        await sleep(2500);
        current = null;
      },
    },
    {
      // Somewhere else on the site (home page after signing in, dashboard…): back to the submit page.
      id: 'toSubmit',
      label: 'sToSubmit',
      match: () => pageAge() > 3000 && !sameAsSubmitUrl() && !(state.done[site.id] || {}).submitted,
      async run() {
        const key = `as_go_${site.id}`;
        const n = +(sessionStorage.getItem(key) || 0);
        if (n >= 3) return status(t('bNoForm'), 'warn');
        sessionStorage.setItem(key, n + 1);
        location.href = site.url;
      },
    },
  ];

  const signInGate = () => clickables().find((b) =>
    /^((sign|log) ?in|login) to (continue|submit|add|list)|^go to (sign|log) ?in|^please (sign|log) ?in/i.test(textOf(b)));

  function sameAsSubmitUrl() {
    try {
      const u = new URL(site.url);
      return u.hostname === location.hostname && u.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '');
    } catch (e) {
      return false;
    }
  }

  const steps = [...(site.steps || []), ...GENERIC_STEPS];
  function findStep() {
    for (const st of steps) {
      try {
        if (st.match()) return st;
      } catch (e) {}
    }
    return null;
  }

  // Native checkboxes and button-style ones (Radix: role=checkbox + aria-checked).
  const isChecked = (el) => el.checked === true || el.getAttribute('aria-checked') === 'true';

  // Tick the n checkboxes (role=checkbox buttons with a label next to them) that best match the product.
  async function pickCheckboxes(scope, n, fallback = /productivity|other/i) {
    const boxes = $$('[role=checkbox], input[type=checkbox]', scope).filter(shown).map((el) => {
      const label = (el.id && $(`label[for="${CSS.escape(el.id)}"]`)) || el.closest('label') || el.parentElement;
      return { el, text: label ? textOf(label) : '' };
    }).filter((o) => o.text);
    const want = n - boxes.filter((o) => isChecked(o.el)).length;
    if (want <= 0) return;
    let picks = rankOptions(boxes.filter((o) => !isChecked(o.el))).slice(0, want);
    if (!picks.length) picks = boxes.filter((o) => fallback.test(o.text)).slice(0, want);
    for (const o of picks) {
      o.el.click();
      await sleep(300);
    }
  }

  // Tag inputs that turn each entry into a chip on Enter.
  async function addChips(input, items) {
    for (const item of items.map((x) => x.trim()).filter(Boolean).slice(0, 5)) {
      setField(input, item);
      for (const type of ['keydown', 'keypress', 'keyup']) {
        input.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
      }
      await sleep(300);
    }
  }

  // A dialog asking to tick N items before going on (YouTools' "Pick 3 Better Tools").
  async function pickInDialog(titleRe, n, nextRe) {
    const dialog = $$('[role=dialog], [aria-modal=true], dialog[open]').find((d) => shown(d) && titleRe.test(d.textContent));
    if (!dialog) return;
    const boxes = $$('[role=checkbox], input[type=checkbox]', dialog).filter(shown);
    const isOn = (b) => b.checked || b.getAttribute('aria-checked') === 'true';
    for (const b of boxes.filter((x) => !isOn(x)).slice(0, Math.max(0, n - boxes.filter(isOn).length))) {
      b.click();
      await sleep(300);
    }
    const next = $$('button', dialog).find((b) => shown(b) && nextRe.test(textOf(b)) && !b.disabled);
    if (next) {
      status(t('bPicked', { n }));
      next.click();
      await sleep(3000);
    }
  }

  function makeCtx() {
    return {
      site, status, finish, fail, setField, valueOf, submit, findSubmit, waitHuman, typeform, pickInDialog, autoAgree: state.settings.autoAgree,
      sleep, shown, textOf, clickables, t, isChecked, pickCheckboxes, rankOptions, addChips, product: state.product,
    };
  }

  async function runStep(step) {
    if (busy || finished) return;
    // Two automatic attempts per step and page; progress (form steps) resets the count.
    const progress = Object.keys(state.done[site.id] || {}).length;
    const key = `as_${step.id}_${location.pathname}_${progress}_${state.done[site.id]?.draftSteps || 0}_${submissionName()}`;
    const attempts = +(sessionStorage.getItem(key) || 0);
    if (attempts >= 2 && step.id !== 'login') {
      status(t('bTwice', { step: t(step.label) }), 'warn');
      return;
    }
    sessionStorage.setItem(key, attempts + 1);
    busy = true;
    running = step;
    stepStartedAt = Date.now();
    try {
      status(t('bRunning', { step: t(step.label) }));
      await step.run(makeCtx());
    } catch (e) {
      if (!finished) status(t('bError', { msg: e.message }), 'warn');
    } finally {
      busy = false;
      running = null;
    }
  }

  async function tick() {
    if (!mine() || finished) return;
    if (location.href !== lastHref) {
      lastHref = location.href;
      urlChangedAt = Date.now();
      current = null;
      noStepReported = false;
      await sleep(1000);
    }
    if (isCfChallenge()) {
      if (!cfWaiting) {
        cfWaiting = true;
        waitHuman('').catch(() => {}).then(() => {
          cfWaiting = false;
          current = null;
          urlChangedAt = Date.now();
        });
      }
      return;
    }
    if (cfWaiting || busy) return;
    // After submitting: a confirmation, or the site moved on to another page (dashboard, listing…).
    // The confirmation counts even when the page shows the form again (e.g. /submit?submitted=1).
    const sub = (state.done[site.id] || {}).submitted;
    if (sub && !looksLikeLogin() && !PAY_RE.test(location.href)) {
      const sameUrl = location.href === sub.href;
      const ok = newSuccess(sameUrl ? sub.baseline : []);
      if (ok) return finish(ok.slice(0, 80));
      if (!sameUrl && !findForm() && pageAge() > 4000 && !site.success) return finish(t('bRedirected', { path: location.pathname }));
    }
    // The page changed in place (modal opened, next step): re-match.
    if (current && Date.now() - stepStartedAt > 3000 && findStep() !== current) {
      current = null;
      noStepReported = false;
    }
    if (current) return;
    current = findStep();
    if (current) return runStep(current);
    if (pageAge() > 15000 && !noStepReported) {
      noStepReported = true;
      status(t('bNoStep'), 'warn');
    }
  }

  // ---------------------------------------------------------------------------
  // Typeform (one question at a time)
  // ---------------------------------------------------------------------------
  const TF_KEYS = [
    [/first name/i, 'firstName'], [/last name|surname/i, 'lastName'], [/your (full )?name/i, 'fullName'],
    [/e-?mail/i, 'email'], [/website|url|link|domain/i, 'url'],
    [/long description|describe .*in detail/i, 'description'],
    [/tagline|one.?liner|short|slogan|in one sentence/i, 'tagline'],
    [/(company|startup|product|tool|app|service)('s)? name|name of (the|your)/i, 'name'],
    [/describe|description|what does|tell us|about (the|your)/i, 'description'],
  ];
  // Questions we answer "No" (advertising, paid upgrades…).
  const TF_NO = /advertis|sponsor|promot|paid|upgrade|featured|premium/i;

  // Typeform shows one question at a time and names it in the page title ("Form | Question…"), which works even
  // when the window is in the background and focus doesn't follow. Labels use non-breaking spaces and pull in the
  // neighbouring questions' text, so questions are compared as letters and digits only.
  async function typeform() {
    const alnum = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const labelText = (el) => [
      ...(el.labels ? [...el.labels].map((l) => l.textContent) : []),
      ...(el.getAttribute('aria-labelledby') || '').split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || ''),
    ].join(' ');
    const question = () => document.title.split('|').slice(1).join('|').replace(/…$/, '').replace(/[* ]/g, ' ').replace(/\s+/g, ' ').trim();
    // The field / choices belonging to the current question.
    const isCurrent = (text, q) => alnum(text).replace(/^\d+/, '').startsWith(alnum(q).slice(0, 30));
    const currentField = (q) => $$('input, textarea').find((el) => /^(text|email|url|tel|textarea|file)$/.test(el.type) && isCurrent(labelText(el), q));
    const currentChoices = (q) => {
      // The smallest block holding both a choice and the question text.
      const boxes = $$('[role=radio], [role=checkbox]').filter(shown).map((r) => {
        let n = r.parentElement;
        while (n && !alnum(n.textContent).includes(alnum(q).slice(0, 30))) n = n.parentElement;
        return n;
      }).filter(Boolean).sort((a, b) => a.textContent.length - b.textContent.length);
      return boxes.length ? $$('[role=radio], [role=checkbox]', boxes[0]).filter(shown) : [];
    };
    // A choice's accessible name is its answer; its text also holds the shortcut key ("Key A", "N No").
    const choiceText = (c) => (c.getAttribute('aria-label') ||
      (c.getAttribute('aria-labelledby') || '').split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim() ||
      textOf(c).replace(/^(Key\s*)?[A-Z]{1,2}\s+/, '').replace(/^Key\s*[A-Z]{1,2}/, '')).trim();
    const okAfter = (el) => $$('button').find((b) => /^ok\b/i.test(textOf(b)) && (el.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
    const setTyped = (el, value) => {
      el.focus();
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      E.highlight(el);
    };

    const startButton = () => clickables().find((b) => /^(start|begin|let.?s (go|get it started))/i.test(textOf(b)));
    // Questions often repeat the product name ("…a long description for <name>"): match on the rest.
    const own = (q) => q.split(state.product.name).join(' ');
    let lastQ = '';
    let stuck = 0;
    for (const t0 = Date.now(); !finished && Date.now() - t0 < TYPEFORM_WAIT_MS; ) {
      const q = question();
      if (site.typeformPause && q && site.typeformPause.test(q)) {
        status(t('bReview', { label: 'No' }), 'warn');
        watchManualSubmit(document.body, null);
        return;
      }
      stuck = q && q === lastQ ? stuck + 1 : 0;
      lastQ = q;
      const done = $$('button').filter(shown).find((b) => /^submit/i.test(textOf(b)));
      if (stuck >= 2) {
        // The same question three rounds in a row: tell you (validation error, slow upload, unknown answer) and keep
        // retrying its OK every 5 seconds, so it carries on as soon as the site accepts it.
        status(t('bTypeformAsk', { q: q.slice(0, 60) }), 'warn');
        await sleep(HUMAN_POLL_MS);
      }
      const field = q && currentField(q);
      const choices = q && !field ? currentChoices(q) : [];
      const contact = site.typeformContact;
      if (contact && contact.question.test(q)) {
        const entries = Object.entries(contact.fill).map(([sel, key]) => ({ el: $$(sel).find(shown), key }));
        const missing = [];
        for (const { el, key } of entries) {
          const value = valueOf(key);
          if (!el || !value) missing.push(key);
          else if (el.value !== value) setTyped(el, value);
        }
        if (missing.length || !done) {
          status(t('bMissing', { fields: missing.join(', ') || 'Submit' }), 'warn');
          await sleep(HUMAN_POLL_MS);
          continue;
        }
        await sleep(400);
        return submit(document.body, done);
      } else if (field && field.type === 'file') {
        const img = /logo|icon|avatar/i.test(q) ? state.product.logo : state.product.hero || state.product.logo;
        if (img && !field.files.length) E.setFile(field, E.dataUrlToFile(img, /logo|icon/i.test(q) ? 'logo' : 'image'));
        await sleep(3000);
        const ok = okAfter(field);
        if (ok) ok.click();
      } else if (field) {
        // A demo video / social profile link is optional and not ours to make up.
        const skip = /\bvideo\b|youtube|demo|twitter|linkedin|github|instagram/i.test(own(q)) && !/website|product url/i.test(own(q));
        const hit = !skip && TF_KEYS.find(([re]) => re.test(own(q)));
        const value = hit ? valueOf(hit[1]) : '';
        if (value && field.value !== value) setTyped(field, field.type === 'url' ? state.product.url : value);
        else if (!value && /\*/.test(labelText(field))) {
          status(t('bTypeformAsk', { q: q.slice(0, 60) }), 'warn');
          await sleep(HUMAN_POLL_MS);
          continue;
        }
        await sleep(400);
        const ok = okAfter(field);
        if (ok) ok.click();
      } else if (choices.length) {
        const opts = choices.map((el) => ({ el, text: choiceText(el) }));
        const pick = TF_NO.test(own(q))
          ? opts.find((o) => /^no\b/i.test(o.text))
          : rankOptions(opts)[0] || opts.find((o) => /^other/i.test(o.text));
        if (!pick) {
          status(t('bTypeformChoice'), 'warn');
          await sleep(HUMAN_POLL_MS);
          continue;
        }
        if (pick.el.getAttribute('aria-checked') !== 'true') pick.el.click();
        status(t('bTypeformAnswered', { q: `${q.slice(0, 40)} → ${pick.text}` }));
        await sleep(1800);
        // Multiple-choice questions wait for OK instead of moving on by themselves; the last one shows Submit.
        if (question() === q) {
          const submitBtn = $$('button').filter(shown).find((b) => /^submit/i.test(textOf(b)));
          if (submitBtn) return submit(document.body, submitBtn);
          const ok = okAfter(pick.el);
          if (ok) ok.click();
          await sleep(1200);
        }
        continue;
      } else if (done) {
        return submit(document.body, done);
      } else {
        // Welcome screen (rendered a moment after load): press its start button.
        const start = !q && startButton();
        if (start) start.click();
        await sleep(start ? 2000 : 1000);
        continue;
      }
      status(t('bTypeformAnswered', { q: q.slice(0, 50) }));
      await sleep(1800);
    }
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local' || !(changes.run || changes.done || changes.products || changes.submitter || changes.settings)) return;
    const was = mine();
    await load();
    if (changes.run) await checkOwner();
    // Retried or just reached this site: start over from the current page.
    if (mine() && (!was || (changes.done && !state.done[site.id]))) {
      finished = false;
      current = null;
      urlChangedAt = Date.now();
      Object.keys(sessionStorage).filter((k) => k.startsWith('as_')).forEach((k) => sessionStorage.removeItem(k));
    }
  });

  load().then(checkOwner).then(() => {
    tick();
    setInterval(tick, 1000);
  });
  // ---------------------------------------------------------------------------
  // Google sign-in (accounts.google.com) for the site being processed, in its tab or its sign-in popup:
  // pick the first account in the chooser, then press Continue / Allow. A password or 2-step check is yours.
  // ---------------------------------------------------------------------------
  async function googleSignIn() {
    const res = await chrome.runtime.sendMessage({ type: 'runner:hello', siteId: null }).catch(() => null);
    if (!res || !res.mine) return;
    const { settings = {} } = await chrome.storage.local.get('settings');
    if (settings.lang) I18N.setLang(settings.lang);
    if (settings.googleAuto === false) return;
    const t = (key, vars) => I18N.t(key, vars);
    const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const label = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    const report = (msg, level = '', waitingSince = null) => chrome.runtime.sendMessage({ type: 'siteStatus', siteId: res.siteId, step: t('sGoogle'), msg, level, waitingSince }).catch(() => {});
    const start = Date.now();
    while (Date.now() - start < 3 * 60 * 1000) {
      // Account chooser: the first signed-in account.
      const account = [...document.querySelectorAll('[data-identifier]')].find((el) => visible(el) && el.dataset.identifier.includes('@'));
      if (account) {
        report(t('bGoogleAccount', { email: account.dataset.identifier }));
        account.click();
        await sleep(4000);
        continue;
      }
      // "Sign in to <site>" / permission screen.
      const go = [...document.querySelectorAll('button, [role=button]')].find((b) => visible(b) && /^(continue|allow|confirm|继续|允许|确认)$/i.test(label(b)));
      if (go) {
        report(t('bGoogleContinue'));
        go.click();
        await sleep(4000);
        continue;
      }
      report(t('bGoogleManual', { sec: Math.round((Date.now() - start) / 1000) }), 'wait', start);
      await sleep(5000);
    }
  }
})();
