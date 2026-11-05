// Batch submission page: pick a product and directories, start the queue, follow the results.
(() => {
  const $ = (id) => document.getElementById(id);
  const t = I18N.t;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const send = (msg) => chrome.runtime.sendMessage(msg);
  const STATUS = { pending: 'stPending', running: 'stRunning', waiting: 'stWaiting', attention: 'stAttention', done: 'stDone', failed: 'stFailed' };
  const LOGIN = { false: ['none', 'loginNone'], email: ['email', 'loginEmail'], oauth: ['oauth', 'loginOauth'] };
  const SUBMITTER_FIELDS = ['firstName', 'lastName', 'email', 'password'];

  let products = [];
  let settings = {};
  let run = null;
  let selected = new Set(); // site ids; empty until loaded

  const product = () => products.find((p) => p.id === settings.batchProductId) || null;
  const note = (s) => (s.note && (s.note[I18N.lang] || s.note.en)) || '';

  function msg(text, isErr) {
    $('msg').textContent = text || '';
    $('msg').className = `msg${isErr ? ' err' : ''}`;
  }

  // --- product ----------------------------------------------------------------
  function renderProduct() {
    const box = $('product');
    $('noProducts').hidden = products.length > 0;
    box.innerHTML = products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    box.value = product() ? product().id : '';
    const p = product();
    $('productCard').innerHTML = p
      ? `${p.logo ? `<img src="${esc(p.logo.data)}" alt="">` : `<span class="ph">${esc((p.name || '?')[0].toUpperCase())}</span>`}
         <span class="meta"><div>${esc(p.url)}</div><div>${esc(p.email || '—')}</div></span>`
      : '';
    const missing = p ? [['email', p.email], ['tagline', p.tagline], ['description', p.description], ['logo', p.logo]]
      .filter(([, v]) => !v).map(([k]) => t(k)) : [];
    $('productMissing').hidden = !missing.length;
    $('productMissing').textContent = t('productMissing', { fields: missing.join(', ') });
  }

  // --- sites ------------------------------------------------------------------
  function renderSites() {
    const p = product();
    $('sites').innerHTML = SITES.map((s) => {
      const [cls, label] = LOGIN[String(s.login)];
      const at = p && p.submissions && p.submissions[s.domain];
      const uncertain = p?.submissionRecords?.[s.domain]?.status === 'attempted-unconfirmed';
      const held = p?.submissionRecords?.[s.domain]?.hold === true;
      return `
        <tr data-id="${esc(s.id)}">
          <td class="c-check"><input type="checkbox" ${selected.has(s.id) ? 'checked' : ''} aria-label="${esc(s.name)}"></td>
          <td><div class="sname">${esc(s.name)}</div><div class="snote">${esc(note(s))}</div></td>
          <td class="nowrap"><span class="badge ${cls}">${esc(t(label))}</span>
            ${at ? `<div class="sub-at">✓ ${esc(t('submittedAt', { date: new Date(at).toLocaleDateString() }))}</div>` : uncertain ? `<div class="sub-at">${esc(t('bAttemptUnconfirmed'))}</div>` : held ? `<div class="sub-at">${esc(t('bSubmissionHeld'))}</div>` : ''}</td>
          <td class="nowrap"><a class="open" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(t('open'))}</a></td>
        </tr>`;
    }).join('');
    const eligible = defaultSelection();
    $('all').checked = eligible.size > 0 && selected.size === eligible.size && [...eligible].every(id => selected.has(id));
    $('all').indeterminate = selected.size > 0 && !$('all').checked;
  }

  // Sites already submitted for this product start unticked.
  function defaultSelection() {
    const p = product();
    return new Set(SITES.filter(s => !Store.submissionRecorded(p, s.domain)).map(s => s.id));
  }

  // --- results ----------------------------------------------------------------
  function rowStatus(id) {
    const st = run.status[id];
    const info = run.info[id] || {};
    if (st === 'running' && info.level === 'wait') return 'waiting';
    if (st === 'running' && (info.level === 'warn' || info.level === 'err')) return 'attention';
    return st;
  }

  function renderResults() {
    const card = $('resultCard');
    if (!run || !run.queue || !run.queue.length) {
      card.hidden = true;
      $('start').disabled = false;
      $('stop').disabled = true;
      return;
    }
    card.hidden = false;
    run.status = run.status || {};
    run.info = run.info || {};
    const counts = { running: 0, pending: 0, done: 0, failed: 0 };
    run.queue.forEach((id) => { counts[run.status[id]] = (counts[run.status[id]] || 0) + 1; });
    $('summary').innerHTML = ['running', 'pending', 'done', 'failed']
      .map((k) => `<span>${esc(t(STATUS[k]))}<b>${counts[k]}</b></span>`).join('');
    $('results').innerHTML = run.queue.filter(siteById).map((id) => {
      const s = siteById(id);
      const st = rowStatus(id);
      const info = run.info[id] || {};
      const ops = [];
      if (run.status[id] === 'running') ops.push('focusSite', 'done', 'failed', 'retrySite');
      else if (run.status[id] === 'failed') ops.push('focusSite', 'done', 'retrySite');
      else if (run.status[id] === 'done') ops.push('retrySite');
      const opLabel = { focusSite: 'focusTab', done: 'markDone', failed: 'markFailed', retrySite: 'retry' };
      return `
        <tr data-id="${esc(id)}">
          <td class="nowrap"><b>${esc(s.name)}</b></td>
          <td class="nowrap"><span class="badge ${esc(st)}">${esc(t(STATUS[st] || st))}</span></td>
          <td><div class="info ${esc(info.level || '')}"><div class="step">${esc(info.step || '')}</div><div>${esc(info.msg || '')}</div></div></td>
          <td><div class="ops">${ops.map((o) => `<button class="mbtn outlined sm" data-op="${o}">${esc(t(opLabel[o]))}</button>`).join('')}</div></td>
        </tr>`;
    }).join('');

    const active = !!run.active;
    $('start').disabled = active;
    $('stop').disabled = !active;
    if (active) msg(t('running'));
    else if (!counts.pending) msg(t('finishedSummary', { done: counts.done, failed: counts.failed }));
    else msg(t('stopped'));
  }

  $('results').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-op]');
    if (!btn) return;
    const siteId = btn.closest('tr').dataset.id;
    const op = btn.dataset.op;
    const res = op === 'done' || op === 'failed'
      ? await send({ type: 'markSite', siteId, result: op })
      : await send({ type: op, siteId });
    if (res && res.error) msg(res.error, true);
  });

  $('csv').addEventListener('click', () => {
    if (!run || !run.queue) return;
    const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const rows = [['Site', 'URL', 'Status', 'Step', 'Message', 'Finished', 'Transport', 'Method', 'Action (observed)', 'Queue days (unknown if blank)', 'Terms', 'Verification', 'Submitted name', 'Attempted names']];
    for (const id of run.queue) {
      const s = siteById(id);
      if (!s) continue;
      const info = run.info[id] || {};
      const at = (run.doneAt || {})[id];
      const protocol = s.protocol || {};
      const record = product()?.submissionRecords?.[s.domain] || {};
      rows.push([s.name, s.url, t(STATUS[rowStatus(id)] || ''), info.step || '', info.msg || '', at ? new Date(at).toLocaleString() : '', protocol.transport || '', protocol.method || '', protocol.action || '', protocol.queueDays ?? '', protocol.terms || '', protocol.verified || '', record.submittedName || '', (record.attemptedNames || []).join(' → ')]);
    }
    // BOM so Excel opens non-ASCII text correctly.
    const csv = '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `autosubmit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // --- events -----------------------------------------------------------------
  $('product').addEventListener('change', async (e) => {
    settings = await Store.saveSettings({ batchProductId: e.target.value });
    selected = defaultSelection();
    await Store.saveSettings({ batchSites: [...selected] });
    renderProduct();
    renderSites();
  });

  $('sites').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    const id = e.target.closest('tr').dataset.id;
    if (e.target.checked) selected.add(id); else selected.delete(id);
    Store.saveSettings({ batchSites: [...selected] });
    renderSites();
  });
  $('all').addEventListener('change', (e) => {
    selected = e.target.checked ? defaultSelection() : new Set();
    Store.saveSettings({ batchSites: [...selected] });
    renderSites();
  });

  let saveTimer;
  const readSubmitter = () => Object.fromEntries(SUBMITTER_FIELDS.map((k) => [k, k === 'password' ? $(k).value : $(k).value.trim()]));
  SUBMITTER_FIELDS.forEach((k) => $(k).addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => Store.saveSubmitter(readSubmitter()), 300);
  }));
  ['autoSubmit', 'autoAgree', 'googleAuto'].forEach((k) => $(k).addEventListener('change', (e) => Store.saveSettings({ [k]: e.target.checked })));

  $('start').addEventListener('click', async () => {
    clearTimeout(saveTimer);
    await Store.saveSubmitter(readSubmitter());
    if (!product()) return msg(t('pickProductFirst'), true);
    const desc = (product().description || '').trim();
    if (desc.length < Store.MIN_DESCRIPTION) return msg(t('descTooShort', { min: Store.MIN_DESCRIPTION, n: desc.length }), true);
    const ids = SITES.map((s) => s.id).filter((id) => selected.has(id));
    if (!ids.length) return msg(t('bPickSites'), true);
    const res = await send({ type: 'startRun', productId: product().id, ids });
    if (res && res.error) msg(res.error, true);
  });
  $('stop').addEventListener('click', () => send({ type: 'stopRun' }));

  $('lang').addEventListener('change', async (e) => {
    I18N.setLang(e.target.value);
    settings = await Store.saveSettings({ lang: e.target.value });
    renderAll();
  });

  function renderAll() {
    I18N.apply();
    renderProduct();
    renderSites();
    renderResults();
  }

  // --- boot -------------------------------------------------------------------
  async function load(first) {
    const [list, s, submitter, stored] = await Promise.all([
      Store.getProducts(), Store.getSettings(), Store.getSubmitter(), chrome.storage.local.get('run'),
    ]);
    products = list;
    settings = s;
    run = stored.run || null;
    if (settings.lang) I18N.setLang(settings.lang);
    if (!product() && products.length) settings = await Store.saveSettings({ batchProductId: products[0].id });
    if (first) {
      selected = Array.isArray(settings.batchSites) ? new Set(settings.batchSites.filter(id => {
        const site = siteById(id);
        return site && !Store.submissionRecorded(product(), site.domain);
      })) : defaultSelection();
      $('lang').innerHTML = I18N.languages.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
      $('lang').value = I18N.lang;
      SUBMITTER_FIELDS.forEach((k) => { $(k).value = submitter[k] || ''; });
      $('autoSubmit').checked = settings.autoSubmit !== false;
      $('autoAgree').checked = settings.autoAgree !== false;
      $('googleAuto').checked = settings.googleAuto !== false;
    }
    if (!first) selected = new Set([...selected].filter(id => {
      const site = siteById(id);
      return site && !Store.submissionRecorded(product(), site.domain);
    }));
    renderAll();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.run) {
      run = changes.run.newValue || null;
      renderResults();
    }
    if (changes.products) load(false);
  });

  load(true);
})();
