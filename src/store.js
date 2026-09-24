// Local-only persistence (chrome.storage.local). Nothing is ever uploaded.
const Store = (() => {
  const PRODUCTS = 'products';
  const SETTINGS = 'settings';
  const DEFAULT_SETTINGS = { lang: '', selectedId: '', overwrite: false };

  const get = (key, fallback) =>
    new Promise((resolve) => chrome.storage.local.get(key, (r) => resolve(r[key] ?? fallback)));
  const set = (key, value) => new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const FIELDS = ['name', 'url', 'email', 'tagline', 'description', 'useCases', 'features', 'tags', 'logo', 'hero'];

  function normalize(p) {
    const tags = Array.isArray(p.tags)
      ? p.tags
      : String(p.tags || '').split(/[,，\n]/);
    const img = (v) => (v && typeof v === 'object' && typeof v.data === 'string' && v.data.startsWith('data:image/')
      ? { data: v.data, name: String(v.name || 'image.png') }
      : null);
    return {
      id: p.id || uid(),
      name: String(p.name || '').trim(),
      url: String(p.url || '').trim(),
      email: String(p.email || '').trim(),
      tagline: String(p.tagline || '').trim(),
      description: String(p.description || '').trim(),
      useCases: String(p.useCases || '').trim(),
      features: String(p.features || '').trim(),
      tags: tags.map((t) => String(t).trim()).filter(Boolean),
      logo: img(p.logo),
      hero: img(p.hero),
      submissions: p.submissions && typeof p.submissions === 'object' ? p.submissions : {},
      createdAt: p.createdAt || Date.now(),
      updatedAt: Date.now()
    };
  }

  return {
    FIELDS,
    uid,
    normalize,
    getProducts: () => get(PRODUCTS, []),
    saveProducts: (list) => set(PRODUCTS, list),
    async upsertProduct(p) {
      const list = await get(PRODUCTS, []);
      const item = normalize(p);
      const i = list.findIndex((x) => x.id === item.id);
      if (i >= 0) list[i] = { ...item, createdAt: list[i].createdAt, submissions: list[i].submissions || {} };
      else list.push(item);
      await set(PRODUCTS, list);
      return item;
    },
    async deleteProducts(ids) {
      const list = await get(PRODUCTS, []);
      await set(PRODUCTS, list.filter((x) => !ids.includes(x.id)));
    },
    async markSubmitted(id, domain, done) {
      const list = await get(PRODUCTS, []);
      const p = list.find((x) => x.id === id);
      if (!p) return;
      p.submissions = p.submissions || {};
      if (done) p.submissions[domain] = Date.now();
      else delete p.submissions[domain];
      await set(PRODUCTS, list);
    },
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
        if (area === 'local' && (changes[PRODUCTS] || changes[SETTINGS])) cb(changes);
      });
    }
  };
})();
