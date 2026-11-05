// Manage page: CRUD for products ("links"), JSON import/export. Everything lives in chrome.storage.local.
(() => {
  const $ = (id) => document.getElementById(id);
  const t = I18N.t;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let products = [];
  const checked = new Set();
  let editing = null; // product being edited (null = new)
  const images = { logo: null, hero: null };

  let snackTimer;
  function snack(text) {
    $('snack').textContent = text;
    $('snack').hidden = false;
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => { $('snack').hidden = true; }, 2600);
  }

  // --- table ----------------------------------------------------------------
  const ICON_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7h-2v7ZM14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7Z"/></svg>';
  const ICON_EDIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.2V21h3.8L17.8 9.9l-3.8-3.8L3 17.2ZM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8L20.7 7Z"/></svg>';
  const ICON_DEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"/></svg>';

  function safeHref(u) {
    try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : '#'; } catch { return '#'; }
  }

  function render() {
    I18N.apply();
    $('empty').hidden = products.length > 0;
    for (const id of [...checked]) if (!products.some((p) => p.id === id)) checked.delete(id);
    $('rows').innerHTML = products.map((p) => `
      <tr data-id="${esc(p.id)}">
        <td><input type="checkbox" class="row-check" ${checked.has(p.id) ? 'checked' : ''} aria-label="Select"></td>
        <td>${p.logo ? `<img class="t-logo" src="${esc(p.logo.data)}" alt="">` : `<span class="t-logo ph">${esc((p.name || '?')[0].toUpperCase())}</span>`}</td>
        <td>${esc(p.name)}</td>
        <td><a class="t-url" href="${esc(safeHref(p.url))}" target="_blank" rel="noopener noreferrer" title="${esc(p.url)}"><span>${esc(p.url)}</span>${ICON_OPEN}</a></td>
        <td><div class="t-tags">${(p.tags || []).slice(0, 4).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div></td>
        <td>${esc(p.email)}</td>
        <td><div class="t-desc" title="${esc(p.tagline || p.description)}">${esc(p.tagline || p.description)}</div></td>
        <td>
          <button class="act edit" data-act="edit" title="${esc(t('edit'))}">${ICON_EDIT}</button>
          <button class="act del" data-act="delete" title="${esc(t('delete'))}">${ICON_DEL}</button>
        </td>
      </tr>`).join('');
    $('checkAll').checked = products.length > 0 && checked.size === products.length;
    $('checkAll').indeterminate = checked.size > 0 && checked.size < products.length;
    $('deleteSelected').hidden = checked.size === 0;
  }

  $('rows').addEventListener('change', (e) => {
    if (!e.target.classList.contains('row-check')) return;
    const id = e.target.closest('tr').dataset.id;
    if (e.target.checked) checked.add(id); else checked.delete(id);
    render();
  });
  $('checkAll').addEventListener('change', (e) => {
    checked.clear();
    if (e.target.checked) products.forEach((p) => checked.add(p.id));
    render();
  });
  $('rows').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    if (btn.dataset.act === 'edit') openDialog(products.find((p) => p.id === id));
    if (btn.dataset.act === 'delete' && confirm(t('confirmDelete', { n: 1 }))) await Store.deleteProducts([id]);
  });
  $('deleteSelected').addEventListener('click', async () => {
    if (!checked.size || !confirm(t('confirmDelete', { n: checked.size }))) return;
    await Store.deleteProducts([...checked]);
    checked.clear();
  });

  // --- dialog ---------------------------------------------------------------
  const form = $('form');

  function setImage(key, img) {
    images[key] = img;
    const box = document.querySelector(`[data-img="${key}"]`);
    const el = box.querySelector('img');
    el.hidden = !img;
    el.src = img ? img.data : '';
    box.querySelector('em').hidden = !!img;
  }

  function openDialog(p) {
    editing = p || null;
    form.reset();
    $('formErr').hidden = true;
    $('dlgTitle').textContent = p ? t('editLink') : t('addLink');
    const v = p || {};
    for (const k of ['name', 'url', 'email', 'tagline', 'description', 'longDescription', 'useCases', 'features', 'heroUrl', 'country', 'legalName']) form.elements[k].value = v[k] || '';
    form.elements.alternateNames.value = (v.alternateNames || []).join('\n');
    $('pricing').innerHTML = ['', ...Store.PRICING].map((x) => `<option value="${esc(x)}">${esc(x || t('pricingNone'))}</option>`).join('');
    form.elements.pricing.value = v.pricing || '';
    form.elements.tags.value = (v.tags || []).join(', ');
    setImage('logo', v.logo || null);
    setImage('hero', v.hero || null);
    $('dialog').showModal();
    form.elements.name.focus();
  }

  $('add').addEventListener('click', () => openDialog(null));
  $('dlgClose').addEventListener('click', () => $('dialog').close());
  $('dlgCancel').addEventListener('click', () => $('dialog').close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const err = (msg) => { $('formErr').textContent = msg; $('formErr').hidden = false; };
    if (!data.name.trim() || !data.url.trim()) return err(t('required'));
    // Directories such as AppRater reject descriptions under 110 characters.
    const desc = data.description.trim();
    if (desc.length < Store.MIN_DESCRIPTION) return err(t('descTooShort', { min: Store.MIN_DESCRIPTION, n: desc.length }));
    let url = data.url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { new URL(url); } catch { return err(t('invalidUrl')); }
    await Store.upsertProduct({
      ...(editing || {}),
      ...data,
      url,
      logo: images.logo,
      hero: images.hero
    });
    $('dialog').close();
  });

  // Images: downscale and keep as data URLs so autofill can rebuild real File objects.
  const LIMITS = { logo: { max: 512, type: 'image/png' }, hero: { max: 1920, type: 'image/jpeg' } };

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function processImage(file, key) {
    const src = await readAsDataURL(file);
    const img = new Image();
    img.src = src;
    await img.decode();
    const { max, type } = LIMITS[key];
    const w = img.naturalWidth || max;
    const h = img.naturalHeight || max;
    const isSvg = file.type === 'image/svg+xml';
    const base = (file.name || key).replace(/\.[^.]+$/, '');
    if (!isSvg && Math.max(w, h) <= max && file.size <= 1.5 * 1024 * 1024) {
      return { data: src, name: file.name || `${key}.png` };
    }
    const scale = Math.min(1, max / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const outType = isSvg ? 'image/png' : type;
    return { data: canvas.toDataURL(outType, 0.9), name: `${base}.${outType === 'image/png' ? 'png' : 'jpg'}` };
  }

  document.querySelectorAll('.img-fld').forEach((box) => {
    const key = box.dataset.img;
    const input = box.querySelector('input[type=file]');
    box.querySelector('[data-act=pick]').addEventListener('click', () => input.click());
    box.querySelector('[data-act=clear]').addEventListener('click', () => setImage(key, null));
    input.addEventListener('change', async () => {
      const file = input.files[0];
      input.value = '';
      if (!file || !file.type.startsWith('image/')) return;
      try { setImage(key, await processImage(file, key)); } catch { snack(t('importFailed')); }
    });
  });

  // --- import a product from its own website --------------------------------
  // Reads what the site says about itself (name, description, logo, contact) so it does not have to be typed.
  async function readProductPage(url) {
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const pick = (...sels) => {
      for (const s of sels) {
        const v = (doc.querySelector(s) || {}).content || '';
        if (v.trim()) return v.trim();
      }
      return '';
    };
    const abs = (u) => {
      try { return new URL(u, url).href; } catch { return ''; }
    };
    const title = (doc.title || '').trim();
    const name = pick('meta[property="og:site_name"]', 'meta[name="application-name"]', 'meta[property="og:title"]', 'meta[name="twitter:title"]') ||
      title.split(/[|｜\-–—]/)[0].trim();
    const description = pick('meta[property="og:description"]', 'meta[name="description"]', 'meta[name="twitter:description"]');
    // The page title usually ends with the site name ("Remove Text from Video Online | RTFV"): drop it.
    const rawTitle = pick('meta[property="og:title"]', 'meta[name="twitter:title"]') || title;
    const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tagline = (name ? rawTitle.replace(new RegExp(`\\s*[|｜\\-–—]\\s*${esc(name)}\\s*$`, 'i'), '') : rawTitle).trim() || rawTitle;
    const image = abs(pick('meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[property="og:image:url"]'));
    const iconLinks = [...doc.querySelectorAll('link[rel]')].filter((l) => /icon/i.test(l.getAttribute('rel') || ''));
    // The apple-touch-icon is the sharpest one, the .ico cannot be decoded at all.
    const icons = iconLinks
      .sort((a, b) => (/apple-touch-icon/i.test(b.getAttribute('rel') || '') ? 1 : 0) - (/apple-touch-icon/i.test(a.getAttribute('rel') || '') ? 1 : 0))
      .map((l) => abs(l.getAttribute('href')))
      .filter((u) => u && !/\.ico(\?|$)/i.test(u));
    const mailto = (doc.querySelector('a[href^="mailto:"]') || {}).getAttribute ? doc.querySelector('a[href^="mailto:"]').getAttribute('href') : '';
    const body = doc.body ? doc.body.textContent : '';
    const email = mailto ? mailto.replace(/^mailto:/i, '').split('?')[0].trim()
      : ((body.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/) || [])[0] || '');
    return {
      name,
      description,
      tagline,
      email,
      logo: await downloadImage(icons, 'logo'),
      hero: await downloadImage([image], 'hero'),
      heroUrl: image,
    };
  }

  // Fetch the first image that works and store it like an uploaded one.
  async function downloadImage(urls, key) {
    for (const u of urls) {
      if (!u) continue;
      try {
        const res = await fetch(u);
        if (!res.ok) continue;
        const blob = await res.blob();
        if (!/^image\//.test(blob.type)) continue;
        const name = (u.split('/').pop() || 'image').split('?')[0] || 'image';
        const file = new File([blob], name, { type: blob.type });
        return await processImage(file, key);
      } catch (e) {}
    }
    return null;
  }

  $('fromUrl').addEventListener('click', () => {
    $('urlErr').hidden = true;
    $('urlInput').value = '';
    $('urlDialog').showModal();
    $('urlInput').focus();
  });
  $('urlDlgClose').addEventListener('click', () => $('urlDialog').close());
  $('urlDlgCancel').addEventListener('click', () => $('urlDialog').close());
  $('urlForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = $('urlInput').value.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const err = $('urlErr');
    err.hidden = true;
    $('urlInput').disabled = true;
    try {
      const info = await readProductPage(url);
      $('urlDialog').close();
      openDialog({ ...info, url });
    } catch (ex) {
      err.textContent = t('urlImportFailed', { msg: ex.message || ex });
      err.hidden = false;
    } finally {
      $('urlInput').disabled = false;
    }
  });

  // --- import / export ------------------------------------------------------
  $('export').addEventListener('click', async () => {
    const who = await Store.getSubmitter();
    const submitter = Object.fromEntries(['firstName', 'lastName', 'email'].filter(k => typeof who[k] === 'string').map(k => [k, who[k]]));
    const payload = { app: 'AutoSubmit', version: 1, exportedAt: new Date().toISOString(), products, submitter };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `autosubmit-links-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    snack(t('exported', { n: products.length }));
  });

  $('import').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const incoming = Array.isArray(json) ? json : json.products;
      if (!Array.isArray(incoming)) throw new Error('bad format');
      const list = await Store.getProducts();
      let n = 0;
      for (const raw of incoming) {
        if (!raw || typeof raw !== 'object' || !raw.name || !raw.url) continue;
        const item = Store.normalize(raw);
        if (raw.submissions) item.submissions = raw.submissions;
        const i = list.findIndex((x) => x.id === item.id || x.url === item.url);
        if (i >= 0) list[i] = { ...item, id: list[i].id, createdAt: list[i].createdAt,
          submissions: { ...list[i].submissions, ...item.submissions },
          submissionRecords: { ...list[i].submissionRecords, ...item.submissionRecords } };
        else list.push(item);
        n++;
      }
      await Store.saveProducts(list);
      if (json.submitter && typeof json.submitter === 'object') {
        const who = await Store.getSubmitter();
        for (const key of ['firstName', 'lastName', 'email']) {
          if (typeof json.submitter[key] === 'string') who[key] = json.submitter[key].trim();
        }
        await Store.saveSubmitter(who);
      }
      snack(t('imported', { n }));
    } catch {
      snack(t('importFailed'));
    }
  });

  // --- boot -----------------------------------------------------------------
  $('lang').addEventListener('change', async (e) => {
    I18N.setLang(e.target.value);
    await Store.saveSettings({ lang: e.target.value });
    render();
  });

  async function load() {
    const [list, settings] = await Promise.all([Store.getProducts(), Store.getSettings()]);
    products = list;
    if (settings.lang) I18N.setLang(settings.lang);
    $('lang').innerHTML = I18N.languages.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    $('lang').value = I18N.lang;
    render();
  }

  Store.onChange(load);
  load();
})();
