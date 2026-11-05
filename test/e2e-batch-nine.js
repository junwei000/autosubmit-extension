// Batch 09: AI Tools Network free waiting-list form.
// Local fixture only. Stripe checkout is never requested.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const description = 'This video tool removes burned-in subtitles, captions and text with AI. Upload a video, select a text region and download the edited clip while preserving the original frame.';
let received = [];
let stripeHits = 0;

function pageHtml() {
  return `<a href="https://buy.stripe.com/paid">Join now</a>
<form class="wpcf7-form" method="post">
  <select id="cf-subject" name="cf-subject"><option value="">—Please choose an option—</option><option>Get into the waiting list</option><option>Payment queries</option></select>
  <input type="email" name="cf-email"><input type="url" name="cf-website"><input name="cf-name"><textarea name="cf-message"></textarea>
  <input type="radio" name="kc_captcha" value="kc_human"><input type="radio" name="kc_captcha" value="bot">
  <input name="kc_honeypot"><input type="checkbox" id="acceptance" name="acceptance-116"><label for="acceptance">I accept the Terms and conditions.</label>
  <input id="cf-submit" type="submit" value="Send">
</form>
<script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();await fetch('/received',{method:'POST',body:'network'});};</script>`;
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autosubmit-nine-'));
  let context;
  try {
    for (const file of ['manifest.json', 'src', 'icons']) fs.cpSync(path.join(root, file), path.join(dir, file), { recursive: true });
    const source = fs.readFileSync(path.join(dir, 'src/sites.js'), 'utf8')
      .replace("domain:'aitoolsnetwork.com'", "domain:'network.test'")
      .replace("url:'https://aitoolsnetwork.com/join/'", "url:'https://network.test/join/'");
    fs.writeFileSync(path.join(dir, 'src/sites.js'), source);
    context = await chromium.launchPersistentContext('', { headless: true, channel: 'chromium', args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`] });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.protocol === 'chrome-extension:') return route.continue();
      if (url.hostname.includes('stripe.com')) { stripeHits += 1; return route.abort(); }
      if (url.hostname !== 'network.test') return route.abort();
      if (url.pathname === '/received') { received.push(route.request().postData()); return route.fulfill({ status: 200, body: 'ok' }); }
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: pageHtml() });
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
    await batch.evaluate((id) => chrome.runtime.sendMessage({ type: 'startRun', productId: id, ids: ['aitoolsnetwork'] }), productId);
    let run;
    for (let n = 0; n < 180; n++) {
      run = await batch.evaluate(async () => (await chrome.storage.local.get('run')).run);
      if (run.info?.aitoolsnetwork?.msg.includes('Select the car')) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!run.info?.aitoolsnetwork?.msg.includes('Select the car')) throw new Error('Timeout ' + JSON.stringify(run));
    const form = context.pages().find((page) => page.url().includes('network.test'));
    assert.equal(received.length, 0);
    assert.equal(stripeHits, 0);
    assert.equal(await form.locator('#cf-subject').inputValue(), 'Get into the waiting list');
    assert.equal(await form.locator('[name=cf-email]').inputValue(), 'support@example.com');
    assert.equal(await form.locator('[name=cf-website]').inputValue(), 'https://example.com');
    assert.equal(await form.locator('[name=cf-name]').inputValue(), 'Ada Lovelace');
    assert.match(await form.locator('[name=cf-message]').inputValue(), /Video Tool/);
    assert.match(await form.locator('[name=cf-message]').inputValue(), /burned-in subtitles/);
    assert.equal(await form.locator('[name=kc_honeypot]').inputValue(), '');
    assert.equal(await form.locator('input[value=kc_human]').isChecked(), false);
    assert.equal(await batch.evaluate(async () => (await Store.getProducts())[0].submissions['network.test']), undefined);
    console.log('OK: free waiting-list fields filled, captcha and honeypot untouched, paid checkout not opened');
  } finally {
    if (context) await context.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
