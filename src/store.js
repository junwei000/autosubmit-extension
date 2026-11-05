// Local-only persistence (chrome.storage.local). Nothing is ever uploaded.
const Store = (() => {
  const PRODUCTS = 'products';
  const SETTINGS = 'settings';
  const SUBMITTER = 'submitter';
  const DEFAULT_SETTINGS = { lang: '', autoSubmit: true, autoAgree: true, googleAuto: true };

  const get = (key, fallback) =>
    new Promise((resolve) => chrome.storage.local.get(key, (r) => resolve(r[key] ?? fallback)));
  const set = (key, value) => new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const FIELDS = ['name', 'alternateNames', 'url', 'email', 'tagline', 'description', 'longDescription', 'useCases', 'features', 'pricing', 'tags', 'logo', 'hero', 'heroUrl', 'country', 'legalName'];
  const PRICING = ['Free', 'Freemium', 'Free Trial', 'Paid'];
  const MIN_DESCRIPTION = 110;

  function submissionRecorded(product, domain) {
    if (product?.submissionRecords?.[domain]?.hold === true) return true;
    if (product?.submissions?.[domain]) return true;
    return ['attempted-unconfirmed', 'submitted', 'listed', 'submitted-pending-review', 'submitted-listed']
      .includes(product?.submissionRecords?.[domain]?.status);
  }

  function normalize(p) {
    const primaryName = String(p.name || '').trim();
    const seenNames = new Set([primaryName.toLowerCase()]);
    const alternateNames = (Array.isArray(p.alternateNames) ? p.alternateNames : String(p.alternateNames || '').split(/\r?\n/))
      .map(x => String(x).trim()).filter(x => {
        if (!x || seenNames.has(x.toLowerCase())) return false;
        seenNames.add(x.toLowerCase()); return true;
      });
    const tags = Array.isArray(p.tags)
      ? p.tags
      : String(p.tags || '').split(/[,，\n]/);
    const img = (v) => (v && typeof v === 'object' && typeof v.data === 'string' && v.data.startsWith('data:image/')
      ? { data: v.data, name: String(v.name || 'image.png') }
      : null);
    return {
      id: p.id || uid(),
      name: primaryName,
      alternateNames,
      url: String(p.url || '').trim(),
      email: String(p.email || '').trim(),
      tagline: String(p.tagline || '').trim(),
      description: String(p.description || '').trim(),
      longDescription: String(p.longDescription || '').trim(),
      useCases: String(p.useCases || '').trim(),
      features: String(p.features || '').trim(),
      pricing: PRICING.includes(p.pricing) ? p.pricing : '',
      tags: tags.map((t) => String(t).trim()).filter(Boolean),
      logo: img(p.logo),
      hero: img(p.hero),
      heroUrl: /^https?:\/\//i.test(String(p.heroUrl || '').trim()) ? String(p.heroUrl).trim() : '',
      country: String(p.country || '').trim(),
      legalName: String(p.legalName || '').trim(),
      submissions: p.submissions && typeof p.submissions === 'object' ? p.submissions : {},
      submissionRecords: p.submissionRecords && typeof p.submissionRecords === 'object' ? p.submissionRecords : {},
      createdAt: p.createdAt || Date.now(),
      updatedAt: Date.now()
    };
  }

  return {
    FIELDS,
    PRICING,
    MIN_DESCRIPTION,
    submissionRecorded,
    uid,
    normalize,
    getProducts: () => get(PRODUCTS, []),
    saveProducts: (list) => set(PRODUCTS, list),
    async upsertProduct(p) {
      const list = await get(PRODUCTS, []);
      const item = normalize(p);
      const i = list.findIndex((x) => x.id === item.id);
      if (i >= 0) list[i] = { ...item, createdAt: list[i].createdAt, submissions: list[i].submissions || {}, submissionRecords: list[i].submissionRecords || {} };
      else list.push(item);
      await set(PRODUCTS, list);
      return item;
    },
    async deleteProducts(ids) {
      const list = await get(PRODUCTS, []);
      await set(PRODUCTS, list.filter((x) => !ids.includes(x.id)));
    },
    // Batch submission: who submits ({ firstName, lastName, email, password }).
    getSubmitter: () => get(SUBMITTER, {}),
    saveSubmitter: (s) => set(SUBMITTER, s),
    async getSettings() {
      return { ...DEFAULT_SETTINGS, ...(await get(SETTINGS, {})) };
    },
    async saveSettings(patch) {
      const s = { ...(await get(SETTINGS, {})), ...patch };
      await set(SETTINGS, s);
      return s;
    },
    onChange(cb) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes[PRODUCTS] || changes[SETTINGS] || changes[SUBMITTER])) cb(changes);
      });
    }
  };
})();
