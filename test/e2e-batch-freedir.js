// Free AI Tools Directory: fill the Gravity Form and stop at reCAPTCHA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const description = 'This video tool removes burned-in subtitles, captions and text with AI.';
let received = 0;

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autosubmit-freedir-'));
  let context;
  try {
    for (const file of ['manifest.json', 'src', 'icons']) fs.cpSync(path.join(root, file), path.join(dir, file), { recursive: true });
    const source = fs.readFileSync(path.join(dir, 'src/sites.js'), 'utf8')
      .replace("domain:'free-ai-tools-directory.com'", "domain:'freedir.test'")
      .replace("url:'https://free-ai-tools-directory.com/submit-request/'", "url:'https://freedir.test/submit-request/'");
    fs.writeFileSync(path.join(dir, 'src/sites.js'), source);
    context = await chromium.launchPersistentContext('', { headless: true, channel: 'chromium', args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`] });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.protocol === 'chrome-extension:') return route.continue();
      if (url.hostname !== 'freedir.test') return route.abort();
      if (url.pathname === '/received') { received += 1; return route.fulfill({ status: 200, body: 'ok' }); }
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: `<form>
        <input name="input_6"><input name="input_7"><textarea name="input_8"></textarea><input name="input_10">
        <input type="file" name="input_5"><input class="gfield_recaptcha_response" name="input_hash">
        <textarea name="g-recaptcha-response"></textarea>
        <input id="gform_submit_button_1" type="submit" value="Submit"></form>
        <script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();await fetch('/received',{method:'POST'});};</script>` });
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
    await batch.evaluate((id) => chrome.runtime.sendMessage({ type: 'startRun', productId: id, ids: ['freeaitoolsdirectory'] }), productId);
    let run;
    for (let n = 0; n < 180; n++) {
      run = await batch.evaluate(async () => (await chrome.storage.local.get('run')).run);
      if (run.info?.freeaitoolsdirectory?.msg.includes('Complete the reCAPTCHA')) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!run.info?.freeaitoolsdirectory?.msg.includes('Complete the reCAPTCHA')) throw new Error('Timeout ' + JSON.stringify(run));
    const form = context.pages().find((page) => page.url().includes('freedir.test'));
    assert.equal(received, 0);
    assert.equal(await form.locator('[name=input_6]').inputValue(), 'Video Tool');
    assert.equal(await form.locator('[name=input_7]').inputValue(), 'https://example.com');
    assert.equal(await form.locator('[name=input_8]').inputValue(), description);
    assert.equal(await form.locator('[name=input_10]').inputValue(), 'Remove text from video with AI.');
    assert.equal(await form.locator('.gfield_recaptcha_response').inputValue(), '');
    assert.equal(await batch.evaluate(async () => (await Store.getProducts())[0].submissions['freedir.test']), undefined);
    console.log('OK: directory fields filled, honeypot empty, reCAPTCHA stops submission');
  } finally {
    if (context) await context.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
