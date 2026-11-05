// Guide of AI Tool leaves PayPal blank. Insidr selects Free trial and ignores the honeypot.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const description = 'This video tool removes burned-in subtitles, captions and text with AI.';
let received = 0;

function guide() {
  return `<form><input id="name" required><input id="email" type="email" required><input id="paypal-email" type="email">
    <input id="tool-name"><input id="tool-url" type="url"><button type="submit">Submit</button></form>
    <script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();await fetch('/received',{method:'POST',body:'guide'});};</script>`;
}
function insidr() {
  return `<main><input placeholder="e.g. Acme AI"><input type="url" placeholder="https://">
    <select><option>AI Art Generators</option><option>AI Video Tools</option></select>
    <select><option>Freemium</option><option>Free trial</option></select>
    <textarea id="tool-description"></textarea><input placeholder="Your name"><input type="email" placeholder="you@company.com">
    <input name="website_url"><button type="submit">Submit tool</button></main>
    <script>document.querySelector('button').onclick=async e=>{e.preventDefault();await fetch('/received',{method:'POST',body:'insidr'});};</script>`;
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autosubmit-guide-'));
  let context;
  try {
    for (const file of ['manifest.json', 'src', 'icons']) fs.cpSync(path.join(root, file), path.join(dir, file), { recursive: true });
    const source = fs.readFileSync(path.join(dir, 'src/sites.js'), 'utf8')
      .replace("domain:'guideofaitool.com'", "domain:'guide.test'")
      .replace("url:'https://www.guideofaitool.com/submit-ai-tool'", "url:'https://guide.test/submit'")
      .replace("domain:'insidr.ai'", "domain:'insidr.test'")
      .replace("url:'https://www.insidr.ai/submit-tools/'", "url:'https://insidr.test/submit-tools/'");
    fs.writeFileSync(path.join(dir, 'src/sites.js'), source);
    context = await chromium.launchPersistentContext('', { headless: true, channel: 'chromium', args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`] });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.protocol === 'chrome-extension:') return route.continue();
      if (url.hostname !== 'guide.test' && url.hostname !== 'insidr.test') return route.abort();
      if (url.pathname === '/received') { received += 1; return route.fulfill({ status: 200, body: 'ok' }); }
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: url.hostname === 'guide.test' ? guide() : insidr() });
    });
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const batch = await context.newPage();
    await batch.goto(`chrome-extension://${worker.url().split('/')[2]}/src/batch.html`);
    const productId = await batch.evaluate(async (text) => {
      const product = await Store.upsertProduct({ name: 'Video Tool', url: 'https://example.com', email: 'support@example.com', tagline: 'Remove text from video with AI.', description: text, pricing: 'Free Trial' });
      await Store.saveSubmitter({ firstName: 'Ada', lastName: 'Lovelace' });
      await Store.saveSettings({ autoSubmit: true, autoAgree: true, lang: 'en' });
      return product.id;
    }, description);
    const wait = async (id, needle) => {
      for (let n = 0; n < 180; n++) {
        const run = await batch.evaluate(async () => (await chrome.storage.local.get('run')).run);
        if (run.info?.[id]?.msg.includes(needle)) return run;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      throw new Error('Timeout ' + JSON.stringify(await batch.evaluate(async () => (await chrome.storage.local.get('run')).run)));
    };
    const start = async (id) => {
      await batch.evaluate(() => chrome.runtime.sendMessage({ type: 'stopRun' }));
      for (const page of context.pages()) if (page !== batch) await page.close();
      received = 0;
      await batch.evaluate(async () => { const products = await Store.getProducts(); products[0].submissions = {}; products[0].submissionRecords = {}; await Store.saveProducts(products); });
      await batch.evaluate((payload) => chrome.runtime.sendMessage({ type: 'startRun', productId: payload.productId, ids: [payload.id] }), { productId, id });
    };

    await start('guideofaitool');
    await wait('guideofaitool', 'PayPal email');
    const guidePage = context.pages().find((page) => page.url().includes('guide.test'));
    assert.equal(received, 0);
    assert.equal(await guidePage.locator('#name').inputValue(), 'Ada Lovelace');
    assert.equal(await guidePage.locator('#email').inputValue(), 'support@example.com');
    assert.equal(await guidePage.locator('#paypal-email').inputValue(), '');
    assert.equal(await guidePage.locator('#tool-name').inputValue(), 'Video Tool');
    assert.equal(await guidePage.locator('#tool-url').inputValue(), 'https://example.com');

    await start('insidr');
    await wait('insidr', 'Review it');
    const insidrPage = context.pages().find((page) => page.url().includes('insidr.test'));
    assert.equal(received, 0);
    assert.equal(await insidrPage.locator('select').nth(0).inputValue(), 'AI Video Tools');
    assert.equal(await insidrPage.locator('select').nth(1).inputValue(), 'Free trial');
    assert.equal(await insidrPage.locator('[name=website_url]').inputValue(), '');
    assert.equal(await insidrPage.locator('#tool-description').inputValue(), description);
    console.log('OK: PayPal reference stays blank, Insidr uses Free trial, honeypot stays empty');
  } finally {
    if (context) await context.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
