// code.market digest form: 15-word description, SaaS category, no rank purchase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const description = 'This video tool removes burned-in subtitles, captions and text with AI. Upload a video, select a text region and download the edited clip while preserving the original frame.';
let received = 0;

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autosubmit-market-'));
  let context;
  try {
    for (const file of ['manifest.json', 'src', 'icons']) fs.cpSync(path.join(root, file), path.join(dir, file), { recursive: true });
    const source = fs.readFileSync(path.join(dir, 'src/sites.js'), 'utf8')
      .replace("domain:'code.market'", "domain:'market.test'")
      .replace("url:'https://code.market/newsletter/submit'", "url:'https://market.test/newsletter/submit'");
    fs.writeFileSync(path.join(dir, 'src/sites.js'), source);
    context = await chromium.launchPersistentContext('', { headless: true, channel: 'chromium', args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`] });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.protocol === 'chrome-extension:') return route.continue();
      if (url.hostname !== 'market.test') return route.abort();
      if (url.pathname === '/received') { received += 1; return route.fulfill({ status: 200, body: 'ok' }); }
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: `<form>
        <input id="project_url" name="project_url" type="url"><input id="project_name"><textarea id="description"></textarea>
        <input id="twitter_handle"><input type="radio" name="category" value="website"><input type="radio" name="category" value="saas">
        <button type="submit">Submit Project</button></form>
        <button id="rank">Claim rank</button>
        <script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();await fetch('/received',{method:'POST'});};document.querySelector('#rank').onclick=async()=>{await fetch('/received',{method:'POST',body:'rank'});};</script>` });
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
    await batch.evaluate((id) => chrome.runtime.sendMessage({ type: 'startRun', productId: id, ids: ['codemarket'] }), productId);
    let run;
    for (let n = 0; n < 180; n++) {
      run = await batch.evaluate(async () => (await chrome.storage.local.get('run')).run);
      if (run.info?.codemarket?.msg.includes('Review it')) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!run.info?.codemarket?.msg.includes('Review it')) throw new Error('Timeout ' + JSON.stringify(run));
    const form = context.pages().find((page) => page.url().includes('market.test'));
    assert.equal(received, 0);
    assert.equal(await form.locator('#project_url').inputValue(), 'https://example.com');
    assert.equal(await form.locator('#project_name').inputValue(), 'Video Tool');
    assert.equal(await form.locator('#description').inputValue(), 'Remove text from video with AI.');
    assert.equal(await form.locator('#twitter_handle').inputValue(), '');
    assert.equal(await form.locator('input[value=saas]').isChecked(), true);
    assert.equal(await batch.evaluate(async () => (await Store.getProducts())[0].submissions['market.test']), undefined);
    console.log('OK: digest fields stay within word limits, SaaS selected, rank button not clicked');
  } finally {
    if (context) await context.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
