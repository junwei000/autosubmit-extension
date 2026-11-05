// End-to-end: generic field coverage plus legacy BestofAI/YouTools fixtures.
// The synthetic generic adapter must not inherit current ToolScout wizard restrictions.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ext = path.resolve(__dirname, '..');
const fixture = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const TAGLINE = 'Turn prompts into cinematic clips.';
const DESCRIPTION = 'Generate AI video in a few seconds. Turn prompts into cinematic clips.';

(async () => {
  const testExt = fs.mkdtempSync(path.join(os.tmpdir(), 'autosubmit-generic-'));
  for (const file of ['manifest.json', 'src', 'icons']) fs.cpSync(path.join(ext, file), path.join(testExt, file), {recursive:true});
  fs.appendFileSync(path.join(testExt, 'src/sites.js'), `\nSITES.push({id:'genericfixture',name:'Generic fixture',domain:'generic.test',url:'https://generic.test/submit',login:false,reviewBeforeSubmit:true});\n`);
  let ctx;
  try {
  ctx = await chromium.launchPersistentContext('', {
    headless: true, channel: 'chromium',
    args: [`--disable-extensions-except=${testExt}`, `--load-extension=${testExt}`],
    viewport: { width: 1280, height: 860 }
  });
  const html = (body) => ({ status: 200, contentType: 'text/html', body });
  await ctx.route('**/*', route => route.request().url().startsWith('chrome-extension:') ? route.continue() : route.abort());
  await ctx.route('https://generic.test/**', (route) => route.fulfill(html(fixture('fixture.html'))));
  await ctx.route('https://youtools.ai/**', (route) =>
    route.fulfill(html(new URL(route.request().url()).pathname === '/submit' ? fixture('fixture-short.html') : '<h1>Dashboard</h1>')));
  await ctx.route('https://bestofai.com/**', (route) => route.fulfill(html(fixture('fixture-bestofai.html'))));

  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];
  const png = fs.readFileSync(path.join(ext, 'icons/icon128.png')).toString('base64');

  const batch = await ctx.newPage();
  await batch.goto(`chrome-extension://${extId}/src/batch.html`);
  const productId = await batch.evaluate(async (png) => {
    const p = await Store.upsertProduct({
      name: 'H3 Max', url: 'https://h3max.pro', email: 'support@h3max.pro', pricing: 'Freemium',
      description: 'Generate AI video in a few seconds. Turn prompts into cinematic clips.',
      useCases: 'Marketing videos\nSocial clips', features: 'Text to video\n1080p export',
      tags: 'AI Video, Productivity', tagline: 'Turn prompts into cinematic clips.',
      logo: { data: 'data:image/png;base64,' + png, name: 'logo.png' },
      hero: { data: 'data:image/png;base64,' + png, name: 'hero.png' }
    });
    await Store.saveSubmitter({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@h3max.pro' });
    await Store.saveSettings({ batchProductId: p.id, autoSubmit: true, autoAgree: true, lang: 'en' });
    return p.id;
  }, png);
  await batch.reload();
  await batch.screenshot({ path: path.join(__dirname, 'shot-batch.png'), fullPage: true });

  // Routing doesn't catch the first navigation of a tab the extension opens, so reload each site tab once.
  ctx.on('page', async (p) => {
    await p.waitForLoadState('domcontentloaded').catch(() => {});
    const site = ['https://generic.test/submit', 'https://youtools.ai/submit', 'https://bestofai.com/'].find((u) => p.url().includes(new URL(u).hostname));
    if (site && !p.__rerouted) { p.__rerouted = true; await p.goto(p.url().includes('youtools') ? 'https://youtools.ai/submit' : p.url().includes('bestofai') ? 'https://bestofai.com/' : 'https://generic.test/submit').catch(() => {}); }
  });
  const res = await batch.evaluate((m) => chrome.runtime.sendMessage(m), { type: 'startRun', productId, ids: ['genericfixture', 'youtools', 'bestofai'] });
  if (res && res.error) throw new Error(res.error);
  let run;
  for (let i = 0; i < 60; i++) {
    await batch.waitForTimeout(1000);
    run = await batch.evaluate(async () => (await chrome.storage.local.get('run')).run);
    // These old form fixtures now run behind the adapters' explicit review gate.
    // Verify they wait, then simulate the user's final click on the local fixture only.
    for (const id of ['genericfixture', 'bestofai']) {
      if (run.info[id]?.msg.includes('Review it')) {
        const page = ctx.pages().find(p => p.url().includes(id === 'genericfixture' ? 'generic.test' : 'bestofai.com'));
        const button = page?.locator('form button:not([type=button])').filter({hasText:id === 'genericfixture' ? /^Submit$/ : /^Submit Tool$/});
        if (button && await button.count()) await button.click();
      }
    }
    if (!run.active) break;
  }
  await batch.screenshot({ path: path.join(__dirname, 'shot-results.png'), fullPage: true });
  console.log('run:', JSON.stringify({ status: run.status, info: run.info }, null, 2));

  // Read back what each fixture received (kept in the fixture origin's localStorage).
  const submitted = async (url) => {
    const p = await ctx.newPage();
    await p.goto(url);
    const v = await p.evaluate(() => JSON.parse(localStorage.getItem('submitted') || 'null'));
    await p.close();
    return v || {};
  };
  const main = await submitted('https://generic.test/submit');
  const short = await submitted('https://youtools.ai/other');
  const boai = await submitted('https://bestofai.com/');
  console.log('generic fixture received:', JSON.stringify(main, null, 2));
  console.log('youtools received:', JSON.stringify(short, null, 2));
  console.log('bestofai received:', JSON.stringify(boai, null, 2));

  const expect = {
    submitter_name: 'Ada Lovelace', toolName: 'H3 Max', website: 'https://h3max.pro', contact: 'support@h3max.pro',
    short_desc: TAGLINE, q1: DESCRIPTION, features: 'Text to video\n1080p export', usecases: 'Marketing videos\nSocial clips',
    category: 'vid', pricing: 'Freemium', tags: 'AI Video, Productivity', twitter: '', ph: '', hp: '',
    'cat:productivity': true, 'terms:yes': true
  };
  const failures = Object.entries(expect).filter(([k, v]) => main[k] !== v).map(([k, v]) => `${k}=${JSON.stringify(main[k])} (want ${JSON.stringify(v)})`);
  if (!(main.logo || []).length || !(main.screenshot || []).length) failures.push('logo/screenshot not uploaded');
  for (const [k, v] of Object.entries(short)) {
    const want = k === 'url' ? 'https://h3max.pro' : k === 'long' ? DESCRIPTION : k === 'plan' ? 'free' : TAGLINE;
    if (v !== want) failures.push(`youtools ${k}=${JSON.stringify(v)} (want ${JSON.stringify(want)})`);
  }
  const boaiWant = { url: 'https://h3max.pro', title: 'H3 Max', tags: 'AI Video, Productivity', description: DESCRIPTION, category: '1' };
  for (const [k, v] of Object.entries(boaiWant)) {
    if (boai[k] !== v) failures.push(`bestofai ${k}=${JSON.stringify(boai[k])} (want ${JSON.stringify(v)})`);
  }
  if (run.status.genericfixture !== 'done' || run.status.youtools !== 'done' || run.status.bestofai !== 'done') failures.push(`run status ${JSON.stringify(run.status)}`);
  const product = await batch.evaluate(async (id) => (await Store.getProducts()).find((p) => p.id === id), productId);
  for (const d of ['generic.test', 'youtools.ai', 'bestofai.com']) {
    if (!product.submissions[d]) failures.push(`submission not recorded on the product: ${d}`);
  }

  if (failures.length) { console.error('FAILED:\n  ' + failures.join('\n  ')); process.exitCode = 1; }
  else console.log('OK: generic fields and two legacy directory fixtures filled, submitted and recorded');
  } finally {
    if (ctx) await ctx.close();
    fs.rmSync(testExt, {recursive:true, force:true});
  }
})().catch((e) => { console.error(e); process.exit(1); });
