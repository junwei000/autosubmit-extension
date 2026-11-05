// Batch 08: 设计狮 Tencent survey and AI未来百科 link form.
// All pages and network are local Playwright fixtures, never live submissions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const description = 'This video tool removes burned-in subtitles, captions and text with AI. Upload a video, select a text region and download the edited clip while preserving the original frame.';
let mode = 'ready';
let received = [];

function designshi() {
  const title = mode === 'changed-label' ? '01 请填写一个新问题' : '01 您要推荐的网址是什么？';
  return `<p>若您有好的设计类站点，可以提交申请（需在行业内有一定的知名度方可收录）</p>
<input name="s" placeholder="搜索">
<div class="question-list">
  <div class="question"><div class="question-title">${title}</div><input class="inputs-input" placeholder="请输入网址"></div>
  <div class="question"><div class="question-title">02 请说明您的推荐理由？</div><input class="inputs-input" placeholder="请输入"></div>
  <div class="question"><div class="question-title">03 请留下你的联系邮箱</div><input class="inputs-input" placeholder="wj@qq.com"></div>
</div>
<button class="btn-submit" type="submit">提交</button>
<script>document.querySelector('button.btn-submit').onclick=async e=>{e.preventDefault();await fetch('/received',{method:'POST',body:'designshi'});};</script>`;
}

function hubpro() {
  return `<input name="s" placeholder="搜索"><p>请登录后再提交申请</p>
<form>
  <input placeholder="网站名称"><input placeholder="网站网址"><input type="file">
  <select name="parent"><option value="-1">请选择入驻类别</option><option value="59">AI写作工具</option><option value="62">AI视频工具</option></select>
  <textarea id="link_content_1" name="link_content_1"></textarea><button type="submit">提交</button>
</form>
<script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();await fetch('/received',{method:'POST',body:'hubpro'});};</script>`;
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autosubmit-eight-'));
  let context;
  try {
    for (const file of ['manifest.json', 'src', 'icons']) fs.cpSync(path.join(root, file), path.join(dir, file), { recursive: true });
    const source = fs.readFileSync(path.join(dir, 'src/sites.js'), 'utf8')
      .replace("domain:'998877.com.cn'", "domain:'designshi.test'")
      .replace("url:'https://wj.qq.com/s2/8138981/1c44/'", "url:'https://designshi.test/s2/8138981/1c44/'")
      .replace("domain:'aihubpro.cn'", "domain:'hubpro.test'")
      .replace("url:'https://www.aihubpro.cn/link-register'", "url:'https://hubpro.test/link-register'");
    fs.writeFileSync(path.join(dir, 'src/sites.js'), source);
    context = await chromium.launchPersistentContext('', { headless: true, channel: 'chromium', args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`] });
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.protocol === 'chrome-extension:') return route.continue();
      if (url.hostname !== 'designshi.test' && url.hostname !== 'hubpro.test') return route.abort();
      if (url.pathname === '/received') { received.push(request.postData()); return route.fulfill({ status: 200, body: 'ok' }); }
      const body = url.hostname === 'designshi.test' ? designshi() : hubpro();
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body });
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
    const wait = async (predicate) => {
      for (let n = 0; n < 180; n++) {
        const run = await batch.evaluate(async () => (await chrome.storage.local.get('run')).run);
        if (predicate(run)) return run;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      throw Error('Timeout ' + JSON.stringify(await batch.evaluate(async () => (await chrome.storage.local.get('run')).run)));
    };
    const start = async (id) => {
      await batch.evaluate(() => chrome.runtime.sendMessage({ type: 'stopRun' }));
      for (const page of context.pages()) if (page !== batch) await page.close();
      received = [];
      await batch.evaluate(async () => {
        const products = await Store.getProducts();
        products[0].submissions = {};
        products[0].submissionRecords = {};
        await Store.saveProducts(products);
      });
      await batch.evaluate((payload) => chrome.runtime.sendMessage({ type: 'startRun', productId: payload.productId, ids: [payload.id] }), { productId, id });
    };
    const pageFor = (host) => context.pages().find((page) => page !== batch && page.url().includes(host));

    mode = 'ready';
    await start('designshi');
    await wait((run) => run.info.designshi?.msg.includes('Review it'));
    const survey = pageFor('designshi.test');
    assert.equal(received.length, 0, 'eligibility pause must not submit');
    assert.equal(await survey.locator('input[name=s]').inputValue(), '');
    assert.equal(await survey.locator('.question').nth(0).locator('input').inputValue(), 'https://example.com');
    assert.equal(await survey.locator('.question').nth(1).locator('input').inputValue(), description);
    assert.equal(await survey.locator('.question').nth(2).locator('input').inputValue(), 'support@example.com');
    assert.equal(await batch.evaluate(async () => (await Store.getProducts())[0].submissions['designshi.test']), undefined);

    mode = 'changed-label';
    await start('designshi');
    await wait((run) => run.info.designshi?.msg.includes('question labels changed'));
    assert.equal(received.length, 0, 'changed questions must not submit');

    await start('aihubpro');
    await wait((run) => run.info.aihubpro?.msg.includes('Log in before submitting'));
    const form = pageFor('hubpro.test');
    assert.equal(received.length, 0, 'login and icon gate must not submit');
    assert.equal(await form.locator('input[name=s]').inputValue(), '');
    assert.equal(await form.locator('input[placeholder="网站名称"]').inputValue(), 'Video Tool');
    assert.equal(await form.locator('input[placeholder="网站网址"]').inputValue(), 'https://example.com');
    assert.equal(await form.locator('textarea').inputValue(), description);
    assert.equal(await form.locator('select').inputValue(), '62');
    assert.equal(await batch.evaluate(async () => (await Store.getProducts())[0].submissions['hubpro.test']), undefined);
    console.log('OK: design survey fills and pauses, changed questions stop, link form selects AI视频工具 and does not submit');
  } finally {
    if (context) await context.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
