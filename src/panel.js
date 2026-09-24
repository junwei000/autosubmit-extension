// Side panel UI. Talks to the content script through a private MessagePort.
(() => {
  const $ = (id) => document.getElementById(id);
  const t = I18N.t;

  let port = null;
  let products = [];
  let settings = {};
  let page = { domain: '', title: '' };
  let detect = null;
  let lastFill = null;

  // --- connection -----------------------------------------------------------
  window.addEventListener('message', (e) => {
    if (port || e.source !== window.parent || !e.data || e.data.type !== 'autosubmit:init' || !e.ports[0]) return;
    port = e.ports[0];
    port.onmessage = (ev) => onContentMessage(ev.data || {});
    port.postMessage({ type: 'ready' });
  });
  const send = (msg) => port && port.postMessage(msg);

  function onContentMessage(msg) {
    if (msg.type === 'pageInfo') {
      page = msg;
      renderPage();
      renderSubmitted();
    } else if (msg.type === 'detectResult') {
      detect = msg;
      renderDetect();
    } else if (msg.type === 'fillResult') {
      lastFill = msg;
      renderResult();
    }
  }

  // --- helpers --------------------------------------------------------------
  const selected = () => products.find((p) => p.id === settings.selectedId);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

  let toastTimer;
  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  // --- render ---------------------------------------------------------------
  function renderAll() {
    I18N.apply();
    renderPage();
    renderDetect();
    renderCards();
    renderPreview();
    renderResult();
    renderSubmitted();
  }

  function renderPage() {
    $('domain').textContent = page.domain || '—';
    $('page').textContent = page.title || '—';
    $('domain').title = page.domain || '';
    $('page').title = page.title || '';
  }

  function renderDetect() {
    const n = detect ? detect.fields : 0;
    $('detectDot').classList.toggle('on', n > 0);
    $('detectText').textContent = n ? t('formsDetected', { forms: detect.forms, fields: n }) : t('noForms');
  }

  function renderCards() {
    const box = $('cards');
    $('emptyLinks').hidden = products.length > 0;
    box.hidden = products.length === 0;
    const sel = selected();
    $('selectedPill').innerHTML = `${esc(t('selected'))}: <b>${esc(sel ? sel.name : t('none'))}</b>`;
    box.innerHTML = products.map((p) => {
      const logo = p.logo
        ? `<img class="pcard-logo" src="${esc(p.logo.data)}" alt="">`
        : `<span class="pcard-logo ph">${esc((p.name || '?').slice(0, 1).toUpperCase())}</span>`;
      const done = page.domain && p.submissions && p.submissions[page.domain];
      return `
        <button class="pcard ${p.id === settings.selectedId ? 'active' : ''}" data-id="${esc(p.id)}" title="${esc(p.name)}">
          <span class="pcard-check"></span>
          <span class="pcard-top">${logo}<span class="pcard-name">${esc(p.name)}</span></span>
          <span class="pcard-line">${esc(host(p.url))}</span>
          <span class="pcard-line">${esc(p.email || '—')}</span>
          ${done ? `<span class="pcard-done">✓ ${esc(t('submissions'))}</span>` : ''}
        </button>`;
    }).join('');
    const active = box.querySelector('.pcard.active');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    $('autofill').disabled = !sel;
  }

  function renderPreview() {
    const p = selected();
    $('previewBox').hidden = !p;
    if (!p) return;
    const rows = [
      ['name', p.name], ['url', p.url], ['email', p.email], ['tagline', p.tagline],
      ['description', p.description], ['useCases', p.useCases], ['features', p.features]
    ].filter(([, v]) => v).map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${esc(v)}</dd>`);
    if (p.tags && p.tags.length) rows.push(`<dt>${esc(t('tags'))}</dt><dd>${p.tags.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</dd>`);
    const imgs = [p.logo, p.hero].filter(Boolean).map((i) => `<img src="${esc(i.data)}" alt="">`).join('');
    if (imgs) rows.push(`<dt>${esc(t('logo'))} / ${esc(t('heroImage'))}</dt><dd class="preview-imgs">${imgs}</dd>`);
    $('previewList').innerHTML = rows.join('');
  }

  function renderResult() {
    const box = $('resultBox');
    if (!lastFill) { box.hidden = true; return; }
    box.hidden = false;
    const list = lastFill.filled || [];
    const head = $('resultHead');
    head.textContent = list.length ? t('filledResult', { n: list.length }) : t('nothingFilled');
    head.classList.toggle('warn', !list.length);
    $('resultList').innerHTML = list.map((f) =>
      `<li><span class="rk">${esc(t(f.key))}</span><span class="rv" title="${esc(f.label)}">${esc(f.value)}</span></li>`
    ).join('');
  }

  function renderSubmitted() {
    const p = selected();
    const box = $('submittedBox');
    box.hidden = !p || !page.domain;
    if (box.hidden) return;
    const ts = p.submissions && p.submissions[page.domain];
    $('submitted').checked = !!ts;
    $('submittedText').textContent = ts
      ? t('submittedOn', { date: new Date(ts).toLocaleDateString() })
      : t('markSubmitted');
  }

  // --- events ---------------------------------------------------------------
  $('cards').addEventListener('click', async (e) => {
    const card = e.target.closest('.pcard');
    if (!card) return;
    settings = await Store.saveSettings({ selectedId: card.dataset.id });
    lastFill = null;
    renderCards();
    renderPreview();
    renderResult();
    renderSubmitted();
  });

  $('previewToggle').addEventListener('click', () => {
    const list = $('previewList');
    list.hidden = !list.hidden;
    $('previewToggle').classList.toggle('open', !list.hidden);
  });

  $('rescan').addEventListener('click', () => send({ type: 'detect' }));
  $('close').addEventListener('click', () => send({ type: 'close' }));
  $('clear').addEventListener('click', () => { send({ type: 'clear' }); lastFill = null; renderResult(); });

  $('autofill').addEventListener('click', () => {
    const p = selected();
    if (!p) return toast(t('pickFirst'));
    send({ type: 'autofill', productId: p.id, overwrite: $('overwrite').checked });
  });

  $('overwrite').addEventListener('change', (e) => Store.saveSettings({ overwrite: e.target.checked }));

  $('submitted').addEventListener('change', async (e) => {
    const p = selected();
    if (!p || !page.domain) return;
    await Store.markSubmitted(p.id, page.domain, e.target.checked);
  });

  const openManage = () => {
    if (port) send({ type: 'openManage' });
    else chrome.runtime.sendMessage({ type: 'autosubmit:openManage' });
  };
  $('manage').addEventListener('click', openManage);
  $('addLink').addEventListener('click', openManage);
  $('addFirst').addEventListener('click', openManage);

  $('lang').addEventListener('change', async (e) => {
    I18N.setLang(e.target.value);
    settings = await Store.saveSettings({ lang: e.target.value });
    renderAll();
  });

  // --- boot -----------------------------------------------------------------
  async function load() {
    [products, settings] = await Promise.all([Store.getProducts(), Store.getSettings()]);
    if (settings.lang) I18N.setLang(settings.lang);
    if (!selected() && products.length) settings = await Store.saveSettings({ selectedId: products[0].id });
    $('lang').innerHTML = I18N.languages.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    $('lang').value = I18N.lang;
    $('overwrite').checked = !!settings.overwrite;
    renderAll();
  }

  Store.onChange(load);
  load();
})();
