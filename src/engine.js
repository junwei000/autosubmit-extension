// AutoSubmit form engine: finds the fields of a submission form, works out what each one asks for and fills it.
// Used by runner.js (batch submission) in the same content-script world.
(() => {
  if (window.top !== window || window.__autosubmitLoaded) return;
  window.__autosubmitLoaded = true;

  const HIGHLIGHT_ATTR = 'data-autosubmit-filled';

  // ---------------------------------------------------------------------------
  // Field discovery
  // ---------------------------------------------------------------------------
  const SKIP_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'password', 'search', 'range', 'color', 'date', 'datetime-local', 'month', 'week', 'time', 'number']);

  function isVisible(el) {
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    const r = el.getBoundingClientRect();
    // Honeypots are often parked off the page (left: -9999px) instead of hidden.
    if (r.right + scrollX <= 0 || r.bottom + scrollY <= 0) return false;
    return r.width > 0 && r.height > 0;
  }

  function collectFields(root = document) {
    const out = [];
    const els = root.querySelectorAll('input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]');
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
      if (kind === 'check') {
        if (!isVisible(el) && !(el.labels && [...el.labels].some(isVisible))) continue;
      } else if (kind !== 'file' && !isVisible(el)) continue;
      out.push({ el, kind });
    }
    return out;
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
        if (c.contains(el)) continue;
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
    // Personal names: skipped, unless a batch run supplies the submitter.
    person: /\b(first|last|full|given|family|sur)\s?name\b|\byour name\b|\bcontact name\b|\bauthor\b|\bmaker name\b|\bfounder\b|姓名/,
    firstName: /\b(first|given)\s?name\b/,
    lastName: /\b(last|family|sur)\s?name\b/,
    notOurs: /\bphone\b|\btelephone\b|\bpassword\b|\bcoupon\b|\bpromo\b|\bcaptcha\b|\bsearch\b|\btwitter\b|\bx\.com\b|\blinkedin\b|\bfacebook\b|\binstagram\b|\byoutube\b|\bgithub\b|\bdiscord\b|\btiktok\b|product\s?hunt|messenger|\bskype\b|whatsapp|telegram|wechat|\bfax\b|\bpricing\b|\bprice\b|\baffiliate\b|\bnewsletter\b|\bdiscount\b|电话|手机|密码|验证码/,
    pricing: /\bpricing\b|\bprice model\b|\bpricing model\b|\bplan type\b|收费|定价/,
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

  function classify(field, desc, opts = {}) {
    const { el, kind } = field;
    const type = (el.getAttribute('type') || '').toLowerCase();
    const s = desc.direct || desc.ctx;
    const both = desc.all;

    if (kind === 'file') {
      const accept = (el.getAttribute('accept') || '').toLowerCase();
      if (accept && !/image|\.png|\.jpe?g|\.webp|\.gif|\.svg|\*/.test(accept)) return null;
      if (el.dataset.autosubmitImage) return el.dataset.autosubmitImage;
      if (RX.logo.test(both)) return 'logo';
      if (RX.hero.test(both)) return 'hero';
      return 'image?';
    }
    if (kind === 'select') {
      // An unlabelled select offering Free / Freemium / Paid is the pricing model.
      const opts = [...el.options].map((o) => o.text.trim().toLowerCase());
      if (RX.pricing.test(both) || opts.includes('freemium') || (opts.includes('free') && opts.includes('paid'))) return 'pricing';
      return RX.tags.test(both) ? 'tags' : null;
    }

    const ac = (el.getAttribute('autocomplete') || '').toLowerCase().split(/\s+/).pop();
    if (type === 'email' || ac === 'email') return 'email';
    if (ac === 'url') return 'url';
    if (opts.submitter && ac === 'given-name') return 'firstName';
    if (opts.submitter && ac === 'family-name') return 'lastName';
    if (opts.submitter && ac === 'name') return 'fullName';
    if (/^(name|given-name|family-name|additional-name|nickname|username|tel|tel-national|organization-title|current-password|new-password|one-time-code)$/.test(ac)) return null;
    if (RX.notOurs.test(desc.direct) && !RX.email.test(desc.direct)) return null;
    if (RX.person.test(desc.direct) && !RX.email.test(desc.direct)) {
      if (!opts.submitter) return null;
      return RX.firstName.test(desc.direct) ? 'firstName' : RX.lastName.test(desc.direct) ? 'lastName' : 'fullName';
    }
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

    // Nothing in the direct hints – try the surrounding context once more (a field with its own label we
    // don't understand keeps it, so it doesn't borrow the label of the field above).
    if (desc.direct && desc.ctx && !desc.labelled) return classify(field, { direct: '', ctx: desc.ctx, all: desc.ctx }, opts);
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

  function valueFor(key, product, el, submitter) {
    const tags = product.tags || [];
    const who = submitter || {};
    switch (key) {
      // First/last names identify a person; never substitute a product name.
      case 'firstName': return who.firstName;
      case 'lastName': return who.lastName;
      case 'fullName': return [who.firstName, who.lastName].filter(Boolean).join(' ') || product.name;
      case 'pricing': return product.pricing;
      case 'name': return product.name;
      case 'url': return product.url;
      case 'email': return product.email || who.email;
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

  function selectPricing(el, pricing) {
    const want = String(pricing || '').trim().toLowerCase();
    if (!want) return false;
    const opts = [...el.options].filter((o) => o.value !== '' && !o.disabled);
    const chosen = opts.find((o) => o.text.trim().toLowerCase() === want) ||
      opts.find((o) => o.text.trim().toLowerCase().startsWith(want));
    if (!chosen) return false;
    setNativeValue(el, chosen.value);
    return chosen.text.trim();
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
  // opts.root limits filling to one form, opts.skip lists selectors to leave alone,
  // opts.submitter ({ firstName, lastName, email }) lets batch runs fill "Your name" style fields.
  function autofill(product, { overwrite, root, skip = [], submitter } = {}) {
    clearHighlights();
    const fields = collectFields(root || document).filter(({ el }) => !skip.some((sel) => el.matches(sel)));
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
        const pricing = String(product.pricing || '').trim().toLowerCase();
        if (pricing && texts.includes(pricing) && RX.pricing.test(clean(`${el.name} ${contextText(el)}`))) {
          if (!el.checked) el.click();
          if (el.checked) record(field, 'pricing', product.pricing, '✓');
          continue;
        }
        const tag = (product.tags || []).find((t) => texts.includes(t.trim().toLowerCase()));
        if (tag && !el.checked) {
          el.click();
          if (!el.checked) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
          record(field, 'tags', tag, '✓');
        }
        continue;
      }

      const desc = describe(el);
      const key = classify(field, desc, { submitter });
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
        const picked = key === 'pricing' ? selectPricing(el, product.pricing) : selectTag(el, product.tags || []);
        if (picked) record(field, key, label, picked);
        continue;
      }

      let value = valueFor(key, product, el, submitter);
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

  // Shared with runner.js (batch submission), which runs in the same isolated world.
  self.AutoSubmitEngine = {
    collectFields, describe, classify, autofill, valueFor, fitLength, isVisible,
    setNativeValue, setRichValue, setFile, dataUrlToFile, highlight, clean, RX
  };
})();
