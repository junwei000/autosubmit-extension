// AutoSubmit content script: floating launcher, panel host, and the form detection / autofill engine.
(() => {
  if (window.top !== window || window.__autosubmitLoaded) return;
  window.__autosubmitLoaded = true;

  const PANEL_URL = chrome.runtime.getURL('src/panel.html');
  const EXT_ORIGIN = new URL(PANEL_URL).origin;
  const HIGHLIGHT_ATTR = 'data-autosubmit-filled';

  // ---------------------------------------------------------------------------
  // Launcher button + panel iframe (inside a closed shadow root so page CSS can't touch it)
  // ---------------------------------------------------------------------------
  const host = document.createElement('autosubmit-root');
  host.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0; width: 0; height: 0;';
  const shadow = host.attachShadow({ mode: 'closed' });

  shadow.innerHTML = `
    <style>
      .launcher {
        position: fixed; right: -14px; width: 46px; height: 46px; border-radius: 50%;
        cursor: pointer; user-select: none; touch-action: none;
        box-shadow: 0 2px 10px rgba(0,0,0,.25); transition: right .18s ease, transform .18s ease;
        background: transparent; border: 0; padding: 0; outline: none;
      }
      .launcher:hover, .launcher.open, .launcher.dragging { right: 6px; }
      .launcher:active { transform: scale(.96); }
      .launcher img { width: 46px; height: 46px; display: block; pointer-events: none; border-radius: 50%; }
      .badge {
        position: absolute; top: -3px; left: -3px; min-width: 16px; height: 16px; padding: 0 4px;
        border-radius: 8px; background: #d97706; color: #fff; font: 600 10px/16px system-ui, sans-serif;
        text-align: center; box-sizing: border-box; display: none;
      }
      .panel {
        position: fixed; right: 12px; top: 12vh; width: 300px; height: 76vh; min-height: 520px; max-height: calc(100vh - 24px);
        border: 0; border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.28); background: #fff;
        display: none; color-scheme: normal;
      }
      .panel.open { display: block; }
      @media (max-height: 560px) { .panel { top: 12px; min-height: 0; height: calc(100vh - 24px); } }
    </style>
    <button class="launcher" title="AutoSubmit" aria-label="AutoSubmit">
      <img alt="" src="${chrome.runtime.getURL('icons/logo.svg')}">
      <span class="badge"></span>
    </button>
    <iframe class="panel" title="AutoSubmit" allow="clipboard-write"></iframe>
  `;
  const launcher = shadow.querySelector('.launcher');
  const badge = shadow.querySelector('.badge');
  const frame = shadow.querySelector('.panel');
  (document.body || document.documentElement).appendChild(host);

  let port = null; // MessagePort to the panel
  let panelOpen = false;

  chrome.storage.local.get('settings', ({ settings }) => {
    const top = settings && typeof settings.buttonTop === 'number' ? settings.buttonTop : 62;
    launcher.style.top = `clamp(8px, ${top}vh, calc(100vh - 54px))`;
  });

  function openPanel() {
    if (!frame.src) {
      frame.addEventListener('load', connectPanel, { once: true });
      frame.src = PANEL_URL;
    } else {
      send({ type: 'pageInfo', ...pageInfo() });
      send(detectSummary());
    }
    frame.classList.add('open');
    launcher.classList.add('open');
    panelOpen = true;
  }
  function closePanel() {
    frame.classList.remove('open');
    launcher.classList.remove('open');
    panelOpen = false;
  }
  const togglePanel = () => (panelOpen ? closePanel() : openPanel());

  function connectPanel() {
    const channel = new MessageChannel();
    port = channel.port1;
    port.onmessage = (e) => handlePanelMessage(e.data || {});
    frame.contentWindow.postMessage({ type: 'autosubmit:init' }, EXT_ORIGIN, [channel.port2]);
  }
  const send = (msg) => port && port.postMessage(msg);

  // Drag vertically, click to toggle.
  let drag = null;
  launcher.addEventListener('pointerdown', (e) => {
    drag = { y: e.clientY, startTop: launcher.getBoundingClientRect().top, moved: false };
    launcher.setPointerCapture(e.pointerId);
  });
  launcher.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    launcher.classList.add('dragging');
    const top = Math.min(Math.max(8, drag.startTop + dy), window.innerHeight - 54);
    launcher.style.top = `${top}px`;
  });
  launcher.addEventListener('pointerup', () => {
    if (!drag) return;
    const { moved } = drag;
    drag = null;
    launcher.classList.remove('dragging');
    if (moved) {
      const vh = (launcher.getBoundingClientRect().top / window.innerHeight) * 100;
      chrome.storage.local.get('settings', ({ settings }) => {
        chrome.storage.local.set({ settings: { ...(settings || {}), buttonTop: Math.round(vh * 10) / 10 } });
      });
    } else {
      togglePanel();
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'autosubmit:toggle') togglePanel();
  });

  // ---------------------------------------------------------------------------
  // Panel protocol
  // ---------------------------------------------------------------------------
  async function handlePanelMessage(msg) {
    switch (msg.type) {
      case 'ready':
        send({ type: 'pageInfo', ...pageInfo() });
        send(detectSummary());
        break;
      case 'detect':
        send(detectSummary());
        break;
      case 'autofill': {
        const { products = [] } = await chrome.storage.local.get('products');
        const product = products.find((p) => p.id === msg.productId);
        if (!product) return send({ type: 'fillResult', error: 'notFound', filled: [] });
        const filled = autofill(product, { overwrite: !!msg.overwrite });
        send({ type: 'fillResult', filled });
        break;
      }
      case 'clear':
        clearHighlights();
        break;
      case 'close':
        closePanel();
        break;
      case 'openManage':
        chrome.runtime.sendMessage({ type: 'autosubmit:openManage' });
        break;
    }
  }

  const pageInfo = () => ({ domain: location.hostname.replace(/^www\./, ''), title: document.title, url: location.href });

  // ---------------------------------------------------------------------------
  // Field discovery
  // ---------------------------------------------------------------------------
  const SKIP_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'password', 'search', 'range', 'color', 'date', 'datetime-local', 'month', 'week', 'time', 'number']);

  function isVisible(el) {
    if (host.contains(el)) return false;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function collectFields() {
    const out = [];
    const els = document.querySelectorAll('input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]');
    for (const el of els) {
      if (el.disabled || el.readOnly || el.getAttribute('aria-disabled') === 'true') continue;
      const tag = el.tagName;
      let kind;
      if (tag === 'INPUT') {
        const type = (el.getAttribute('type') || 'text').toLowerCase();
        if (SKIP_INPUT_TYPES.has(type)) continue;
        if (type === 'file') kind = 'file';
        else if (type === 'checkbox' || type === 'radio') kind = 'check';
        else kind = 'text';
      } else if (tag === 'TEXTAREA') kind = 'textarea';
      else if (tag === 'SELECT') kind = 'select';
      else {
        // Nested contenteditable children belong to the outer editor.
        if (el.parentElement && el.parentElement.closest('[contenteditable="true"],[contenteditable=""]')) continue;
        kind = 'rich';
      }
      // Upload widgets usually hide the real <input type=file>, so it's exempt from the visibility check.
      if (kind === 'file') {
        if (host.contains(el)) continue;
      } else if (kind === 'check') {
        if (!isVisible(el) && !(el.labels && [...el.labels].some(isVisible))) continue;
      } else if (!isVisible(el)) continue;
      out.push({ el, kind });
    }
    return out;
  }

  function detectSummary() {
    const fields = collectFields().filter((f) => f.kind !== 'check');
    const forms = new Set(fields.map((f) => f.el.closest('form')).filter(Boolean));
    const count = fields.length;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count ? 'block' : 'none';
    return { type: 'detectResult', forms: forms.size || (count ? 1 : 0), fields: count };
  }

  // ---------------------------------------------------------------------------
  // Describing a field: gather every hint about what it's asking for
  // ---------------------------------------------------------------------------
  const clean = (s) => String(s || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-\[\].:*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  function textOfIds(ids) {
    return String(ids || '').split(/\s+/).map((id) => {
      const n = id && document.getElementById(id);
      return n ? n.textContent : '';
    }).join(' ');
  }

  const LABELISH = 'label, legend, [role="heading"], h1, h2, h3, h4, h5, h6, [class*="label" i], [class*="title" i], [class*="question" i], [class*="heading" i]';

  function contextText(el) {
    // Closest label-like text in the nearest few ancestors that doesn't wrap the field itself.
    let node = el.parentElement;
    for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
      if (node === document.body) break;
      const candidates = [...node.querySelectorAll(LABELISH)].reverse();
      for (const c of candidates) {
        if (c.contains(el) || host.contains(c)) continue;
        // Nearest label-ish text that precedes the field.
        if (!(c.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
        const txt = c.textContent.trim();
        if (txt && txt.length < 140) return txt;
      }
      // Fall back to a short text node right before the field.
      const prev = node.previousElementSibling;
      if (depth < 2 && prev && !prev.querySelector('input,textarea,select')) {
        const txt = prev.textContent.trim();
        if (txt && txt.length < 100) return txt;
      }
    }
    return '';
  }

  function describe(el) {
    const parts = [];
    if (el.labels) for (const l of el.labels) parts.push(l.textContent);
    const wrap = el.closest('label');
    if (wrap && !(el.labels && [...el.labels].includes(wrap))) parts.push(wrap.textContent);
    parts.push(el.getAttribute('aria-label'), textOfIds(el.getAttribute('aria-labelledby')));
    const labelled = parts.some((p) => p && p.trim());
    parts.push(
      el.getAttribute('placeholder'),
      el.getAttribute('data-placeholder'),
      el.getAttribute('title'),
      el.getAttribute('name'),
      el.id
    );
    const direct = clean(parts.filter(Boolean).join(' | '));
    const ctx = clean(contextText(el));
    return { direct, ctx, labelled, all: `${direct} | ${ctx}` };
  }

  // ---------------------------------------------------------------------------
  // Classification rules (order matters: specific before generic)
  // ---------------------------------------------------------------------------
  const RX = {
    notOurs: /\b(first|last|full|given|family|sur)\s?name\b|\byour name\b|\bcontact name\b|\bauthor\b|\bmaker name\b|\bfounder\b|\bphone\b|\btelephone\b|\bpassword\b|\bcoupon\b|\bpromo\b|\bcaptcha\b|\bsearch\b|\btwitter\b|\bx\.com\b|\blinkedin\b|\bfacebook\b|\binstagram\b|\byoutube\b|\bgithub\b|\bdiscord\b|\btiktok\b|\bpricing\b|\bprice\b|\baffiliate\b|\bnewsletter\b|姓名|电话|手机|密码|验证码/,
    email: /e-?mail|邮箱|电子邮件/,
    logo: /\blogo\b|\bicon\b|\bfavicon\b|\bavatar\b|\bthumbnail\b|图标|头像/,
    hero: /screenshot|\bhero\b|\bcover\b|\bbanner\b|\bimage\b|\bimages\b|\bpreview\b|\bpicture\b|\bphoto\b|\bgallery\b|\bmedia\b|截图|封面|配图|图片|主图/,
    tags: /\btags?\b|\bkeywords?\b|\bcategor(y|ies)\b|\btopics?\b|标签|关键词|分类|类别/,
    useCases: /use\s?cases?|\busages?\b|\bscenarios?\b|who (is it|it's|its) for|\bideal for\b|target (users|audience)|使用场景|应用场景|用例|适用/,
    features: /\bfeatures?\b|\bhighlights?\b|\bcapabilit(y|ies)\b|\bwhat (it|does it) do\b|功能|特点|特性|亮点/,
    // Tagline also covers every flavour of "short description".
    tagline: /tagline|slogan|one.?liner|\bone.?line\b|\b(short|brief|mini|quick)\b[\w\s]{0,20}?\b(desc|description|intro|introduction|summary|pitch|overview|text|bio)\b|\b(desc|description)\s?\(?\s?(short|brief)\b|shortdesc|\bsubtitle\b|\bsubheading\b|\bheadline\b|\bsummary\b|\bexcerpt\b|\bpitch\b|一句话|简短|简要|简述|短描述|短介绍|标语|口号|副标题/,
    description: /\bdesc\b|description|\babout\b|\bdetails?\b|introduction|\bintro\b|overview|\bcontent\b|\bbody\b|\bmessage\b|tell us|explain|描述|介绍|简介|详情|说明|正文/,
    url: /\burl\b|\buri\b|\blink\b|homepage|home page|website|web site|\bsite\b|\bdomain\b|\bweb\b|网址|网站|链接|官网|地址/,
    name: /\bname\b|\btitle\b|product|\btool\b|\bapp\b|\bproject\b|\bstartup\b|\bbrand\b|名称|标题|产品|工具/
  };

  function classify(field, desc) {
    const { el, kind } = field;
    const type = (el.getAttribute('type') || '').toLowerCase();
    const s = desc.direct || desc.ctx;
    const both = desc.all;

    if (kind === 'file') {
      const accept = (el.getAttribute('accept') || '').toLowerCase();
      if (accept && !/image|\.png|\.jpe?g|\.webp|\.gif|\.svg|\*/.test(accept)) return null;
      if (RX.logo.test(both)) return 'logo';
      if (RX.hero.test(both)) return 'hero';
      return 'image?';
    }
    if (kind === 'select') return RX.tags.test(both) ? 'tags' : null;

    const ac = (el.getAttribute('autocomplete') || '').toLowerCase().split(/\s+/).pop();
    if (type === 'email' || ac === 'email') return 'email';
    if (ac === 'url') return 'url';
    if (/^(name|given-name|family-name|additional-name|nickname|username|tel|tel-national|organization-title|current-password|new-password|one-time-code)$/.test(ac)) return null;
    if (RX.notOurs.test(desc.direct) && !RX.email.test(desc.direct)) return null;
    if (RX.email.test(s)) return 'email';

    // Text value that points at an image asset: we only have files, skip.
    if ((RX.logo.test(s) || RX.hero.test(s)) && (type === 'url' || RX.url.test(s))) return null;

    if (type === 'url') return 'url';
    if (RX.tags.test(s)) return 'tags';
    if (RX.useCases.test(s)) return 'useCases';
    if (RX.features.test(s)) return 'features';
    if (RX.tagline.test(s)) return 'tagline';
    if (RX.description.test(s)) {
      // A visible "Short description" label beats a generic name="description" attribute.
      if (!desc.labelled && desc.ctx && RX.tagline.test(desc.ctx) && !RX.description.test(desc.ctx.replace(RX.tagline, ''))) return 'tagline';
      // A length-capped single-line box can't hold a full description.
      const max = parseInt(el.getAttribute('maxlength'), 10);
      if (kind === 'text' && max > 0 && max <= 160) return 'tagline';
      return 'description';
    }
    if (RX.url.test(s) && !/\bname\b|\btitle\b|名称/.test(s)) return 'url';
    if (RX.name.test(s)) return 'name';

    // Nothing in the direct hints – try the surrounding context once more.
    if (desc.direct && desc.ctx) return classify(field, { direct: '', ctx: desc.ctx, all: desc.ctx });
    if (kind === 'textarea' || kind === 'rich') return 'description?';
    return null;
  }

  // ---------------------------------------------------------------------------
  // Values
  // ---------------------------------------------------------------------------
  function firstSentence(text) {
    const m = String(text || '').match(/^[\s\S]*?[.!?。！？](\s|$)/);
    return (m ? m[0] : String(text || '')).trim();
  }

  function valueFor(key, product, el) {
    const tags = product.tags || [];
    switch (key) {
      case 'name': return product.name;
      case 'url': return product.url;
      case 'email': return product.email;
      case 'tagline': return product.tagline || firstSentence(product.description);
      case 'description': return product.description || product.tagline;
      case 'useCases': return product.useCases || product.description;
      case 'features': return product.features || product.description;
      case 'tags': return tags.join(el && el.tagName === 'TEXTAREA' ? '\n' : ', ');
      default: return '';
    }
  }

  function fitLength(el, value) {
    const max = parseInt(el.getAttribute('maxlength'), 10);
    if (!max || max <= 0 || value.length <= max) return value;
    const cut = value.slice(0, max);
    const sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trim();
  }

  // ---------------------------------------------------------------------------
  // Writers – framework friendly (React/Vue/Angular listen to native input events)
  // ---------------------------------------------------------------------------
  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
      : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    el.focus({ preventScroll: true });
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function setRichValue(el, value) {
    el.focus({ preventScroll: true });
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    // execCommand keeps editors (Quill, ProseMirror, Draft…) in sync with their internal model.
    const ok = document.execCommand && document.execCommand('insertText', false, value);
    if (!ok || el.textContent.trim() !== value.trim()) {
      el.textContent = value;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    }
    el.blur();
  }

  function dataUrlToFile(img, fallbackName) {
    const [head, b64] = img.data.split(',');
    const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/png';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ext = mime.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    let name = img.name || `${fallbackName}.${ext}`;
    if (!/\.[a-z0-9]+$/i.test(name)) name += `.${ext}`;
    return new File([bytes], name, { type: mime, lastModified: Date.now() });
  }

  function setFile(el, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    el.files = dt.files;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function selectTag(el, tags) {
    const want = tags.map((t) => t.toLowerCase());
    const opts = [...el.options].filter((o) => o.value !== '' && !o.disabled);
    let chosen = null;
    for (const w of want) {
      chosen = opts.find((o) => o.text.trim().toLowerCase() === w) ||
        opts.find((o) => o.text.trim().toLowerCase().includes(w) || w.includes(o.text.trim().toLowerCase()));
      if (chosen) break;
    }
    if (!chosen) return false;
    if (el.multiple) {
      for (const o of opts) {
        if (want.some((w) => o.text.trim().toLowerCase() === w)) o.selected = true;
      }
      chosen.selected = true;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      setNativeValue(el, chosen.value);
    }
    return chosen.text.trim();
  }

  function checkLabelText(el) {
    const parts = [];
    if (el.labels) for (const l of el.labels) parts.push(l.textContent);
    parts.push(el.getAttribute('aria-label'), el.value);
    return parts.filter(Boolean).map((s) => s.trim().toLowerCase());
  }

  function highlight(el) {
    const target = el.type === 'file' ? (el.closest('label, [class*="upload" i], [class*="drop" i]') || el) : el;
    target.setAttribute(HIGHLIGHT_ATTR, '');
    target.style.setProperty('outline', '2px solid #f59e0b', 'important');
    target.style.setProperty('outline-offset', '1px', 'important');
  }

  function clearHighlights() {
    document.querySelectorAll(`[${HIGHLIGHT_ATTR}]`).forEach((el) => {
      el.removeAttribute(HIGHLIGHT_ATTR);
      el.style.removeProperty('outline');
      el.style.removeProperty('outline-offset');
    });
  }

  const currentValue = (el, kind) => (kind === 'rich' ? el.textContent.trim() : (el.value || '').trim());

  // ---------------------------------------------------------------------------
  // Autofill
  // ---------------------------------------------------------------------------
  function autofill(product, { overwrite }) {
    clearHighlights();
    const fields = collectFields();
    const filled = [];
    const used = new Set();
    const pendingImages = [];
    const pendingDescriptions = [];
    const record = (field, key, label, value) => {
      highlight(field.el);
      used.add(key);
      filled.push({ key, label: (label || '').slice(0, 60), value: String(value).slice(0, 80) });
    };

    for (const field of fields) {
      const { el, kind } = field;
      if (kind === 'check') {
        const texts = checkLabelText(el);
        const tag = (product.tags || []).find((t) => texts.includes(t.trim().toLowerCase()));
        if (tag && !el.checked) {
          el.click();
          if (!el.checked) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
          record(field, 'tags', tag, '✓');
        }
        continue;
      }

      const desc = describe(el);
      const key = classify(field, desc);
      if (!key) continue;
      const label = desc.direct || desc.ctx;

      if (kind === 'file') {
        if (el.files && el.files.length && !overwrite) continue;
        pendingImages.push({ field, key, label });
        continue;
      }
      if (key === 'description?') { pendingDescriptions.push({ field, label }); continue; }
      if (currentValue(el, kind) && !overwrite) continue;

      if (kind === 'select') {
        const picked = selectTag(el, product.tags || []);
        if (picked) record(field, 'tags', label, picked);
        continue;
      }

      let value = valueFor(key, product, el);
      if (!value) continue;
      if (kind === 'rich') setRichValue(el, value);
      else {
        value = fitLength(el, value);
        setNativeValue(el, value);
      }
      record(field, key, label, value);
    }

    // Unlabelled textareas: use them for the description if nothing else took it.
    if (!used.has('description') && product.description) {
      const target = pendingDescriptions.find(({ field }) => overwrite || !currentValue(field.el, field.kind));
      if (target) {
        const { field, label } = target;
        const value = field.kind === 'rich' ? product.description : fitLength(field.el, product.description);
        if (field.kind === 'rich') setRichValue(field.el, value); else setNativeValue(field.el, value);
        record(field, 'description', label, value);
      }
    }

    // Images: explicit logo/hero first, then unknown upload slots get logo then hero.
    const images = { logo: product.logo, hero: product.hero };
    const order = ['logo', 'hero'];
    const unknown = [];
    for (const item of pendingImages) {
      if (item.key === 'image?') { unknown.push(item); continue; }
      const img = images[item.key];
      if (!img) continue;
      setFile(item.field.el, dataUrlToFile(img, item.key));
      record(item.field, item.key, item.label, img.name || item.key);
    }
    for (const item of unknown) {
      const key = order.find((k) => images[k] && !used.has(k));
      if (!key) break;
      setFile(item.field.el, dataUrlToFile(images[key], key));
      record(item.field, key, item.label, images[key].name || key);
    }

    return filled;
  }

  // ---------------------------------------------------------------------------
  // Keep the detection badge fresh on SPA pages / multi-step forms
  // ---------------------------------------------------------------------------
  let timer = null;
  const observer = new MutationObserver((mutations) => {
    if (mutations.every((m) => host.contains(m.target) || m.target === host)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const summary = detectSummary();
      if (panelOpen) send(summary);
    }, 800);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(detectSummary, 500);
})();
