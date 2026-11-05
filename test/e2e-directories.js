// Local-only integration tests: actual site adapters, no requests to real directories.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const vm = require('node:vm');
const catalog = fs.readFileSync(path.join(root, 'src/sites.js'), 'utf8');
assert.deepEqual(Array.from(vm.runInNewContext(catalog + '; [siteById("10015"), siteById("baitools")]')), [undefined, undefined], 'published free queues over 100 days must be excluded');
const DESCRIPTION = 'A useful video editing product that removes burned-in text from video while preserving the original background. Upload a clip, select the text regions, and download the processed video. Built for creators who need to prepare clips for localization and reuse.';
const TAGLINE = 'Remove burned-in text from videos while preserving the original background.';
const LONG_DESCRIPTION = DESCRIPTION + '\n\n' + DESCRIPTION;
const received = new Map();
const visited = new Set();
const capture = `<script>document.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  for (const [key,value] of Object.entries(data)) if (value instanceof File) data[key] = value.name;
  await fetch('/received', {method:'POST', body:JSON.stringify(data)});
  document.body.innerHTML = '<h1>Thank you! Your submission was received.</h1>';
});</script>`;
const ordinary = (extra = '', button = 'Submit') => `<form>
  <label>Tool Name <input name="name"></label>
  <label>Website URL <input name="url" type="url" required></label>
  ${extra}<button>${button}</button></form>${capture}`;

const fixtures = {
  'case2.test': `<input name="q" placeholder="Search the web...">
    <form><label>Website URL <input id="url" name="url" type="url" required></label>
    <label>Title <input id="title" name="title"></label>
    <label>Description <textarea id="description" name="description"></textarea></label>
    <label>Category <input id="category-search" placeholder="Search for a category..."></label>
    <input name="category_slug" type="hidden" value="">
    <label>Product pricing <select name="pricing"><option>Free</option><option selected>Paid</option></select></label>
    <label>Email <input id="email" name="email" type="email" required></label>
    <button>Submit</button></form>${capture}`,
  'case3.test': `<main><label>URL <input id="submittedUrl" name="submittedUrl"></label>
    <button type="button" id="fetch">Submit URL</button></main>
    <script>document.querySelector('#fetch').onclick = () => {
      document.querySelector('main').innerHTML = \`<form>
      <label>Product Name <input id="name" name="name"></label>
      <label>Product Tagline <input id="tagline" name="tagline" maxlength="120"></label>
      <label>Product Description <input id="shortDescription" name="shortDescription" maxlength="250"></label>
      <label>Product URL <input id="url" name="url"></label>
      <label>Product Details <textarea id="description" name="description" maxlength="2000"></textarea></label>
      <label>Product Image <input id="imageUploaded" name="hero" type="file" accept="image/png"></label>
      <label>Product Icon <input id="iconUploaded" name="logo" type="file" accept="image/png"></label>
      <label>Other Tags <input id="otherTags" name="otherTags"></label>
      <button>Submit Product</button></form>\`;
    };</script>${capture}`,
  'case4.test': ordinary(`<label><input type="radio" name="launchType" value="free">Free Launch $0</label>
    <label><input type="radio" name="launchType" value="premium" checked>Premium $9.99</label>`, 'Launch'),
  'case5.test': ordinary('', 'Submit for Review ($12.90)'),
  'case6.test': ordinary('<label>Required reciprocal backlink <input name="backlink" required></label>'),
  'case7.test': ordinary('<label><input type="radio" name="listing_plan" value="paid" checked>Paid $20</label>'),
  'case8.test': ordinary('<label><input type="radio" name="listing_type" value="pro" checked>Professional listing</label>'),
  'case9.test': `<input name="q" placeholder="Search"><form id="add-form">
    <input name="website" aria-label="Website honeypot">
    <input name="name" placeholder="Tool name" required><input name="url" type="url" required>
    <textarea name="desc"></textarea><input name="email" type="email">
    <button>Submit for review</button></form>${capture.replace('Thank you! Your submission was received.', 'Thanks! We’ll review your tool and publish it soon.')}`,
  'case10.test': `<form id="wf-form-Tool-submit"><input id="Email-2" name="Email-2" type="email" required>
    <input id="URL-2" name="URL-2" placeholder="humanornot.co" required><input type="submit" value="Submit"></form>
    ${capture.replace('Thank you! Your submission was received.', 'Thank you! Your submission has been received!')}`,
  'case11.test': `<form id="submit-form"><input name="_honey" aria-label="Website">
    <label><input type="radio" name="placement" value="directory">Directory listing Free</label>
    <label><input type="radio" name="placement" value="sponsored" checked>Homepage banner Sponsored</label>
    <input id="tool-name" name="tool_name" required><input id="tool-url" name="tool_url" type="url" required>
    <select id="tool-category" name="tool_category" required><option value=""></option><option>AI Tools</option><option>Media Tools</option></select>
    <select id="tool-pricing" name="tool_pricing" required><option>Free</option><option>Paid</option></select>
    <textarea id="tool-description" name="tool_description" required></textarea>
    <input id="submitter-email" name="submitter_email" type="email" required><button>Submit Tool</button></form>
    ${capture.replace('Thank you! Your submission was received.', 'Tool submitted')}`,
  'case12.test': `<form id="submission-form"><input name="company_website" aria-label="Website">
    <input id="f-url" name="URL" required><input id="f-email" name="EMAIL" required>
    <input id="f-business" name="BUSINESS_NAME" required><textarea id="f-description" name="XDESCRIPTION" required></textarea>
    <input id="f-address" name="ADDRESS"><input id="f-country" name="COUNTRY">
    <button>Add my Site</button><p>By submitting your site you agree to the terms.</p></form>
    ${capture.replace('Thank you! Your submission was received.', 'Your site has been added to the directory.')}`,
  'case13.test': `<form><input name="company" aria-label="Company website">
    <input name="title" required><input name="url" type="url" required><textarea name="description" required></textarea>
    <select name="tag_slug" required><option value=""></option><option>Audio Tools</option><option>Video Tools</option></select>
    <button>Tool einreichen</button></form>${capture.replace('Thank you! Your submission was received.', 'Danke für deine Einreichung!')}`,
  'case14.test': `<form><input id="tool_name" name="tool_name" required><input id="tool_url" name="tool_url" type="url" required>
    <textarea id="description" name="description" required></textarea><input id="submitter_email" name="submitter_email" type="email" required>
    <select name="category" required><option value=""></option><option>Generative Video</option></select>
    <label><input type="radio" name="pricing_tier" value="free">Free</label><label><input type="radio" name="pricing_tier" value="paid">Paid</label>
    <label><input type="checkbox" name="newsletter_opt_in">Join newsletter (Optional)</label><button>Submit Tool</button></form>${capture}`,
  'case15.test': `<form><input id="tool_name" name="tool_name" required><input id="tool_url" name="tool_url" type="url" required>
    <textarea id="tool_description" name="tool_description" required></textarea><input id="submitter_email" name="submitter_email" type="email">
    <select name="tool_category" required><option value=""></option><option>Video Production</option></select>
    <select id="tool_pricing" name="tool_pricing" required><option value=""></option><option value="free">Free/Freemium</option><option value="paid">Paid/Premium</option></select>
    <button>Submit for review</button></form>${capture.replace('Thank you! Your submission was received.', 'Thanks! Your tool was submitted and is pending review.')}`,
  'case16.test': `<form><input name="post_title" maxlength="30"><input name="link"><input name="sescribe" maxlength="80">
    <textarea name="post_content"></textarea><input name="user_name"><input name="contact_details"><input name="tags">
    <select id="post_cat" name="category"><option value="0">选择分类</option><option value="1041">AI视频编辑器 (44)</option></select>
    <div class="tg-plan" data-plan="free" onclick="this.classList.add('active');document.querySelector('[data-plan=paid]').classList.remove('active');document.querySelector('#submitTotalNum').textContent='0'">免费提交</div>
    <div class="tg-plan active" data-plan="paid">付费极速收录</div><em id="submitTotalNum">99</em><button>提交审核</button></form>
    ${capture.replace('Thank you! Your submission was received.', '提交成功，请等待审核。')}`,
  'case17.test': `<form><input name="startupname" maxlength="100"><input name="startupurl" maxlength="100">
    <input name="description" maxlength="100"><textarea name="fulldescription" maxlength="2500"></textarea><textarea name="tags"></textarea>
    <label><input type="radio" name="funding" value="funded">Funding</label>
    <label><input type="radio" name="marketing_budget" value="1000">Marketing budget</label>
    <input name="user"><input name="email"><label><input type="checkbox" name="newsletter_optin">Join newsletter</label>
    <label>Local test human check <input name="math"></label><input type="submit" name="formSubmit" value="Submit Startup">
    </form>${capture}`,
  'case18.test': ordinary('', '提交并支付￥99'),
  'case19.test': ordinary('<label>必填友情链接 <textarea name="reciprocal_cn" required></textarea></label>'),
  'case20.test': ordinary('<label>Company country <select name="country" required><option value="">Choose country</option><option value="AF">Afghanistan</option><option value="US">United States</option></select></label>'),
  'case21.test': ordinary('<label><input name="agree" type="checkbox" required onclick="document.querySelector(\'[name=terms_clicks]\').value=1">I agree to the terms</label><input name="terms_clicks" type="hidden" value="0"><label><input type="checkbox" name="newsletter">Optional newsletter</label>'),
  'case22.test': fs.readFileSync(path.join(root, 'test/fixture-typeform-contact.html'), 'utf8'),
  'case23.test': `<form id="wpforms-form-442"><label>First<input id="wpforms-442-field_0" name="first" required></label>
    <label>Last<input id="wpforms-442-field_0-last" name="last" required></label><input id="wpforms-442-field_1" name="email" type="email" required>
    <input id="wpforms-442-field_3" name="tool_name" required><input id="wpforms-442-field_4" name="tool_url" required>
    <textarea id="wpforms-442-field_2" name="reason" required></textarea>
    <label>Website<input id="wpforms-442-field_5" name="honeypot_5"></label><label>Tool Website<input id="wpforms-442-field_6" name="honeypot_6"></label>
    <button id="wpforms-submit-442">Submit</button></form>${capture.replace('Thank you! Your submission was received.', 'Thanks for suggesting a new tool!')}`,
  'case24.test': `<form><input id="attr_28" name="attr_28"><input id="attr_30" name="attr_30"><textarea id="attr_38" name="attr_38"></textarea><input type="submit" value="提交"></form>${capture.replace('Thank you! Your submission was received.', '操作成功')}`,
  'case25.test': `<form id="submit"><input name="website" aria-label="Website honeypot"><input id="tool_url" name="tool_url" required>
    <input id="tool_name" name="tool_name" required><input id="tagline" name="tagline" maxlength="100" required><textarea id="description" name="description" required></textarea>
    <select id="category" name="category" required><option value=""></option><option value="video">Video and Image</option></select>
    <textarea id="marketing_problem" name="marketing_problem" required></textarea><textarea id="marketing_help" name="marketing_help" required></textarea><input id="marketing_jobs" name="marketing_jobs" required>
    <input id="name" name="name" required><input id="email" name="email" required><input id="starting_price" name="starting_price" placeholder="$19/month">
    <label><input type="radio" name="pricing_model" value="paid">Paid</label><label><input type="radio" name="pricing_model" value="free">Free</label>
    <label><input type="radio" name="launch_preference" value="fast_track" checked>24–48h Priority Fast-Track &amp; Featured Category Placement (Send me sponsorship options)</label>
    <label><input type="radio" name="launch_preference" value="standard_queue">Standard Editorial Queue (2–3 weeks)</label><button>Submit your tool</button></form>
    ${capture.replace('Thank you! Your submission was received.', 'Thanks, Test Video Tool is submitted.')}`,
  'case26.test': `<button onclick="document.querySelector('form').style.display='block'">Submit a tool</button><form style="display:none">
    <input name="title" required><input name="url" required><textarea name="desc" required></textarea>
    <button type="button" aria-expanded="false" onclick="this.setAttribute('aria-expanded',this.getAttribute('aria-expanded')!=='true');this.nextElementSibling.hidden=!this.nextElementSibling.hidden">Product Tags</button>
    <div hidden><label><input type="checkbox" name="tags[]" value="Audio">Audio</label><label><input type="checkbox" name="tags[]" value="Video">Video</label></div>
    <button type="button" aria-expanded="false" onclick="this.setAttribute('aria-expanded',this.getAttribute('aria-expanded')!=='true');this.nextElementSibling.hidden=!this.nextElementSibling.hidden">Product Pricing Model</button>
    <div hidden><label><input type="checkbox" name="models[]" value="Free">Free</label><label><input type="checkbox" name="models[]" value="Paid">Paid</label><label><input type="checkbox" name="models[]" value="Free Trial">Free Trial</label></div>
    <input name="name" required><input name="email" type="email" required><textarea name="message" required></textarea>
    <button>Submit</button><p>By clicking Submit you agree to our Terms and Conditions.</p></form>
    ${capture.replace('Thank you! Your submission was received.', 'Thank you for submitting your tool!')}`,
  'case27.test': `<form><input id="e2e74529-7f39-407c-acba-49f16b296c66" name="tool_name" required><input id="c4fd90a3-f2fe-4df9-a6f2-08f86d373727" name="tool_url" required>
    <textarea id="6755a0ea-8261-44db-a68a-38b7670adb44" name="tool_description" required></textarea><input id="51ba7a53-68ff-4eb7-a266-2925e2939a73" name="submitter_name" required>
    <input type="email" name="email" required><button>Submit</button></form>
    ${capture.replace('Thank you! Your submission was received.', 'Form submitted</h1><h2>Are you interested in a guaranteed spot on our directory and the #1 spot for 5 days?</h2><a href="/fast-track">Paid fast-track</a><h1>')}`,
  'case28.test': fs.readFileSync(path.join(root,'test/fixture-aigclist.html'),'utf8'),
  'case29.test': `<main><div id="panel-website"><form><input name="_honeypot" hidden><input type="url" name="Site-link" placeholder="Website link…" required><textarea name="Creator" placeholder="Add other creators"></textarea><button>Log in to submit →</button></form></div>
    <form id="newsletter"><input type="email" name="newsletter_email"><button>Get weekly roundup →</button></form></main>
    <script>
    const submission = '<div id="panel-website"><a href="/paid">Go Pro</a><p>Or submit for free</p><form><input name="_honeypot" hidden><input type="url" name="Site-link" placeholder="Website link…" required><textarea name="Creator"></textarea><button>Submit website →</button></form></div>';
    document.addEventListener('submit',async e=>{
      e.preventDefault();
      if(e.submitter.textContent.includes('Log in')) { history.pushState({},'', '/login'); document.querySelector('main').innerHTML='<form id="auth"><input type="email" placeholder="your@email.com" required><button>Continue with email →</button></form><p>By continuing, you agree to our terms, privacy policy and weekly email</p>'; }
      else if(e.target.id==='auth') { await fetch('/auth-consent',{method:'POST',body:JSON.stringify({email:e.target.querySelector('input').value})});history.pushState({},'', '/submit'); document.querySelector('main').innerHTML=submission; }
      else { await fetch('/received',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});document.querySelector('main').innerHTML='<h2>Thanks, we’ll review your site soon</h2>'; }
    });</script>`,
};

(async () => {
  let ctx;
  let inspectDraft = async () => {};
  let recordAtDraft;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autosubmit-directories-'));
  const server = http.createServer((req, res) => {
    const host = req.headers.host.split(':')[0];
    visited.add(host + new URL(req.url, 'http://local.test').pathname);
    if (req.method === 'POST') {
      let body = '';
      req.on('data', data => { body += data; });
      req.on('end', async () => {
        if (req.url === '/draft-received') await inspectDraft();
        else received.set(host, JSON.parse(body));
        res.end('ok');
      });
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html><body>${fixtures[host] || ''}</body></html>`);
    }
  });
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    fs.copyFileSync(path.join(root, 'manifest.json'), path.join(dir, 'manifest.json'));
    fs.cpSync(path.join(root, 'src'), path.join(dir, 'src'), { recursive: true });
    fs.cpSync(path.join(root, 'icons'), path.join(dir, 'icons'), { recursive: true });
    // Exercise the retained 10015 adapter with an eligible queue in this local fixture only.
    let source = fs.readFileSync(path.join(dir, 'src/sites.js'), 'utf8').replace('maxReviewDays: 120', 'maxReviewDays: 80');
    for (const [domain, host, pathname] of [
      ['viesearch.com', 'case2.test', '/submit'],
      ['10015.io', 'case3.test', '/product-finder/submit'],
      ['tinylaunchpad.com', 'case4.test', '/projects/submit'],
    ]) {
      source = source.replace(`domain: '${domain}'`, `domain: '${host}'`)
        .replace(`url: 'https://${domain}${pathname}'`, `url: 'http://${host}:${port}${pathname}'`);
    }
    for (const [domain, host] of [['reviewai.net', 'case9.test'], ['humanornot.co', 'case10.test'], ['thetoolbus.ai', 'case11.test'], ['jayde.com', 'case12.test'], ['ki-suche.io', 'case13.test'], ['futuretools.io', 'case14.test'], ['aitools.sh', 'case15.test'], ['ai138.com', 'case16.test'], ['launchingnext.com', 'case17.test'], ['bestaitools.com', 'case23.test'], ['yjpoo.com', 'case24.test'], ['aitoolsmarketer.com', 'case25.test'], ['waildworld.com', 'case26.test'], ['aigclist.com', 'case28.test']]) {
      source = source.replace(`domain: '${domain}'`, `domain: '${host}'`)
        .replace(new RegExp(`url: 'https://(?:www\\.)?${domain.replaceAll('.', '\\.')}[^']*'`), `url: 'http://${host}:${port}/submit'`);
    }
    source = source.replace("domain: 'aitools.inc'", "domain: 'case22.test'")
      .replace("url: 'https://loxr142exnq.typeform.com/to/RB6ZnEf2'", `url: 'http://case22.test:${port}/submit'`);
    source = source.replace("domain: 'aimarketing.directory'", "domain: 'case27.test'")
      .replace("url: 'https://tally.so/embed/nG1V7j?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1'", `url: 'http://case27.test:${port}/submit'`);
    source = source.replace("domain: 'a1.gallery'", "domain: 'case29.test'")
      .replace("url: 'https://www.a1.gallery/submit'", `url: 'http://case29.test:${port}/submit'`);
    const extra = [5, 6, 7, 8, 18, 19, 20, 21].map(n => `{
      id:'policy${n}', name:'Policy ${n}', domain:'case${n}.test', url:'http://case${n}.test:${port}/submit', login:false,
      ${n === 7 ? 'free:/^free/i,' : ''} ${n === 21 ? "check:['input[name=agree]']," : ''} note:{en:'test',zh:'test'}
    }`).join(',');
    source = source.replace('const SITES = [', `const SITES = [${extra},`);
    fs.writeFileSync(path.join(dir, 'src/sites.js'), source);
    ctx = await chromium.launchPersistentContext('', {
      headless: true, channel: 'chromium',
      args: ['--host-resolver-rules=MAP *.test 127.0.0.1', '--no-proxy-server', `--disable-extensions-except=${dir}`, `--load-extension=${dir}`],
    });
    let [worker] = ctx.serviceWorkers();
    if (!worker) worker = await ctx.waitForEvent('serviceworker');
    const batch = await ctx.newPage();
    await batch.goto(`chrome-extension://${worker.url().split('/')[2]}/src/batch.html`);
    await batch.waitForFunction(() => document.querySelector('#lang').options.length > 0);
    const productId = await batch.evaluate(async ({ description, tagline, longDescription, png }) => {
      const p = await Store.upsertProduct({
        name: 'Test Video Tool', url: 'https://example.com', email: 'owner@example.com',
        description, tagline, longDescription, tags: ['AI Video'], pricing: 'Paid',
        logo: { data: `data:image/png;base64,${png}`, name: 'logo.png' },
        hero: { data: `data:image/png;base64,${png}`, name: 'hero.png' },
      });
      return p.id;
    }, { description: DESCRIPTION, tagline: TAGLINE, longDescription: LONG_DESCRIPTION, png: fs.readFileSync(path.join(root, 'icons/icon128.png')).toString('base64') });
    inspectDraft = async () => {recordAtDraft = await batch.evaluate(async () => (await Store.getProducts())[0].submissionRecords['case28.test']);};
    await batch.waitForFunction(() => document.querySelector('#product').options.length === 1);
    await batch.evaluate(async productId => {
      const list = await Store.getProducts();
      list[0].submissions['case9.test'] = Date.now();
      list[0].submissionRecords['case11.test'] = {status:'attempted-unconfirmed', at:Date.now()};
      await Store.saveProducts(list);
      await Store.saveSettings({ batchProductId: productId, autoSubmit: true, autoAgree: true, googleAuto: false, lang: 'en', batchSites: ['firstlook', 'aiextension', 'newaiforyou', 'reviewai', 'thetoolbus', 'viesearch'] });
    }, productId);
    await batch.reload();
    const unavailable = await batch.evaluate(() => ['firstlook', 'aiextension', 'newaiforyou', 'baitools'].map(id => !!siteById(id)));
    assert.deepEqual(unavailable, [false, false, false, false]);
    await batch.waitForFunction(() => document.querySelectorAll('#sites tr').length > 0);
    assert.equal(await batch.locator('#sites input:checked').count(), 1, 'stale saved sites must be removed');
    assert.equal(await batch.locator('tr[data-id=reviewai] input').isChecked(), false, 'saved selections must exclude existing submissions');
    assert.equal(await batch.locator('tr[data-id=thetoolbus] input').isChecked(), false, 'saved selections must exclude uncertain attempts');
    await batch.locator('#all').check();
    assert.equal(await batch.locator('tr[data-id=reviewai] input').isChecked(), false, 'Select all must avoid duplicate submissions');
    assert.equal(await batch.locator('tr[data-id=thetoolbus] input').isChecked(), false, 'Select all must avoid uncertain attempts');
    const rejected = await batch.evaluate(productId => chrome.runtime.sendMessage({ type: 'startRun', productId, ids: ['firstlook', 'aiextension', 'newaiforyou', 'baitools'] }), productId);
    assert.ok(rejected.error, 'excluded directories cannot start through messages');

    const waitRun = async (id, message) => {
      let state;
      for (let i = 0; i < 100; i++) {
        state = await batch.evaluate(async () => (await chrome.storage.local.get('run')).run);
        if (message ? state.info[id]?.msg.includes(message) : state.status[id] === 'done') return state;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      console.error('pages:', await Promise.all(ctx.pages().map(async p => ({ url: p.url(), body: (await p.locator('body').innerText().catch(() => '')).slice(0, 600) }))));
      console.error('tabs:', await batch.evaluate(async () => (await chrome.tabs.query({})).map(({id,url,status}) => ({id,url,status}))));
      throw new Error(`Timed out on ${id}: ${JSON.stringify(state.info[id])}`);
    };
    const run = async (id, message) => {
      await batch.evaluate(async () => chrome.runtime.sendMessage({ type: 'stopRun' }));
      for (const p of ctx.pages()) if (p !== batch) await p.close();
      const result = await batch.evaluate(({ id, productId }) => chrome.runtime.sendMessage({ type: 'startRun', productId, ids: [id] }), { id, productId });
      assert.ok(!result.error, result.error);
      await waitRun(id, message);
      return ctx.pages().find(p => p !== batch && p.url().includes('.test:'));
    };
    await run('viesearch');
    assert.ok(received.has('case2.test'), `Viesearch never submitted; received hosts: ${[...received.keys()]}`);
    assert.equal(received.get('case2.test').url, 'https://example.com');
    assert.equal(received.get('case2.test').title, 'Test Video Tool');
    assert.equal(received.get('case2.test').email, 'owner@example.com');
    assert.equal(received.get('case2.test').description, DESCRIPTION);
    assert.equal(received.get('case2.test').category_slug, '');
    assert.equal(received.get('case2.test').pricing, 'Paid', 'product pricing is not a listing fee');

    const finder = await run('10015', 'Review it');
    const short = await finder.locator('#shortDescription').inputValue();
    assert.ok(short.length >= 60 && short.length <= 250 && DESCRIPTION.startsWith(short));
    assert.equal(await finder.locator('#description').inputValue(), DESCRIPTION);
    assert.equal(await finder.locator('#imageUploaded').evaluate(e => e.files[0].name), 'hero.png');
    assert.equal(await finder.locator('#iconUploaded').evaluate(e => e.files[0].name), 'logo.png');
    assert.ok(!received.has('case3.test'), 'review mode must not submit automatically');
    await finder.getByRole('button', { name: 'Submit Product', exact: true }).click();
    await waitRun('10015');

    const tiny = await run('tinylaunchpad', 'Review it');
    assert.ok(await tiny.locator('input[value=free]').isChecked(), 'free launch should replace paid default');
    assert.ok(!received.has('case4.test'));
    await run('policy5', 'Automatic submission stopped');
    assert.ok(!received.has('case5.test'), 'paid submit button must never be clicked');
    await run('policy6', 'Automatic submission stopped');
    assert.ok(!received.has('case6.test'), 'required reciprocal field must never be submitted');
    await run('policy7', 'No free listing option');
    assert.ok(!received.has('case7.test'), 'missing free plan must stop automatic submission');
    await run('policy8', 'Automatic submission stopped');
    assert.ok(!received.has('case8.test'), 'selected paid listing plan must not be submitted');
    await run('policy18', 'Automatic submission stopped');
    assert.ok(!received.has('case18.test'), 'a CNY paid submit button must never be clicked');
    await run('policy19', 'Automatic submission stopped');
    assert.ok(!received.has('case19.test'), 'a required Chinese reciprocal textarea must block submission');
    const unknownCountry = await run('policy20', 'Still required');
    assert.equal(await unknownCountry.locator('select[name=country]').inputValue(), '', 'never guess a required company country');
    await batch.evaluate(() => Store.saveSettings({autoAgree:false}));
    const uncheckedTerms = await run('policy21', 'Still required');
    assert.equal(await uncheckedTerms.locator('[name=agree]').isChecked(), false, 'site.check must respect disabled autoAgree');
    await batch.evaluate(() => Store.saveSettings({autoAgree:true}));
    await run('policy21');
    assert.equal(received.get('case21.test').agree, 'on');
    assert.equal(received.get('case21.test').terms_clicks, '1', 'agreement must use an active click');
    assert.equal(received.get('case21.test').newsletter, undefined);
    await run('reviewai');
    assert.equal(received.get('case9.test').website, '', 'visible honeypots must remain empty');
    assert.equal(received.get('case9.test').desc, DESCRIPTION);
    await run('humanornot');
    assert.equal(received.get('case10.test')['URL-2'], 'https://example.com');
    assert.equal(received.get('case10.test')['Email-2'], 'owner@example.com');
    await run('thetoolbus');
    assert.equal(received.get('case11.test').placement, 'directory');
    assert.equal(received.get('case11.test').tool_pricing, 'Paid', 'paid product remains truthfully described in a free listing');
    assert.equal(received.get('case11.test').tool_category, 'Media Tools');
    assert.equal(received.get('case11.test')._honey, '');
    await batch.evaluate(() => Store.saveSettings({autoAgree:false}));
    const jayde = await run('jayde', 'Review it');
    assert.ok(!received.has('case12.test'), 'implicit agreement respects disabled autoAgree');
    await jayde.getByRole('button', {name:'Add my Site'}).click();
    await waitRun('jayde');
    assert.equal(received.get('case12.test').ADDRESS, '');
    assert.equal(received.get('case12.test').COUNTRY, '');
    assert.equal(received.get('case12.test').company_website, '');
    await batch.evaluate(() => Store.saveSettings({autoAgree:true}));
    await run('kisuche');
    assert.equal(received.get('case13.test').company, '');
    assert.equal(received.get('case13.test').tag_slug, 'Video Tools');
    await run('futuretools');
    assert.equal(received.get('case14.test').pricing_tier, 'paid', 'pricing_tier describes the product, not a paid listing');
    assert.equal(received.get('case14.test').newsletter_opt_in, undefined);
    await run('aitoolslibrary');
    assert.equal(received.get('case15.test').tool_pricing, 'paid');
    await run('ai138');
    assert.equal(received.get('case16.test').category, '1041');
    assert.equal(received.get('case16.test').link, 'https://example.com');
    assert.ok(received.get('case16.test').sescribe.length <= 80);
    const launch = await run('launchingnext', 'Captcha detected');
    assert.ok(!received.has('case17.test'), 'an empty human check must block automatic submission');
    assert.equal(await launch.locator('[name=math]').inputValue(), '', 'the plugin must never solve the human check');
    assert.equal(await launch.locator('[name=startupname]').inputValue(), 'Test Video Tool');
    assert.equal(await launch.locator('[name=fulldescription]').inputValue(), DESCRIPTION);
    // This fixture has no real CAPTCHA: emulate the user completing its local test control.
    await launch.locator('[name=math]').fill('user-completed-local-check');
    await waitRun('launchingnext');
    const launched = received.get('case17.test');
    assert.equal(launched.math, 'user-completed-local-check');
    assert.equal(launched.funding, undefined);
    assert.equal(launched.marketing_budget, undefined);
    assert.equal(launched.newsletter_optin, undefined);
    assert.equal(launched.description, 'Test Video Tool using AI');
    const typeform = await run('aitoolsinc', 'Still required:');
    assert.ok(!received.has('case22.test'), 'grouped contact step must not submit without real names');
    assert.equal(await typeform.locator('[name=first_name]').inputValue(), '', 'a product name cannot stand in for a personal first name');
    assert.equal(await typeform.locator('[name=email]').inputValue(), 'owner@example.com');

    // Import/export the public contact profile through the actual management UI, without importing/exporting credentials.
    const manage = await ctx.newPage();
    await manage.goto(`chrome-extension://${worker.url().split('/')[2]}/src/manage.html`);
    await manage.evaluate(() => Store.saveSubmitter({password:'local-test-credential'}));
    const products = await manage.evaluate(() => Store.getProducts());
    products[0].alternateNames = ['Alternate Video Tool'];
    await manage.locator('#importFile').setInputFiles({name:'test-import.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({products,submitter:{firstName:'Ada',lastName:'Lovelace',email:'submitter@example.com',password:'must-not-import'}}))});
    await manage.waitForFunction(async () => (await Store.getSubmitter()).firstName === 'Ada');
    assert.equal(await manage.evaluate(async () => (await Store.getSubmitter()).password), 'local-test-credential');
    const downloadEvent = manage.waitForEvent('download');
    await manage.locator('#export').click();
    const exported = JSON.parse(fs.readFileSync(await (await downloadEvent).path(), 'utf8'));
    assert.deepEqual(exported.submitter, {firstName:'Ada',lastName:'Lovelace',email:'submitter@example.com'});
    assert.equal(exported.products[0].longDescription, LONG_DESCRIPTION);
    assert.deepEqual(exported.products[0].alternateNames, ['Alternate Video Tool']);
    assert.equal(exported.products[0].description, DESCRIPTION, 'a long directory description must not replace the original description');
    assert.ok(!JSON.stringify(exported).includes('local-test-credential'), 'exports must not contain submitter credentials');
    await manage.close();
    await waitRun('aitoolsinc');
    assert.deepEqual(received.get('case22.test'), {tool_name:'Test Video Tool',tool_url:'https://example.com',first_name:'Ada',last_name:'Lovelace',email:'owner@example.com'});
    await run('bestaitools');
    assert.equal(received.get('case23.test').first, 'Ada');
    assert.equal(received.get('case23.test').last, 'Lovelace');
    assert.equal(received.get('case23.test').reason, DESCRIPTION);
    assert.equal(received.get('case23.test').honeypot_5, '');
    assert.equal(received.get('case23.test').honeypot_6, '');
    const yjpoo = await run('yjpoo', 'Review it');
    assert.ok(!received.has('case24.test'), 'the pre-submission duplicate check requires final review');
    await yjpoo.getByRole('button', {name:'提交',exact:true}).click();
    await waitRun('yjpoo');
    assert.equal(received.get('case24.test').attr_28, 'Test Video Tool');
    assert.equal(received.get('case24.test').attr_30, 'https://example.com');
    assert.equal(received.get('case24.test').attr_38, DESCRIPTION);
    await run('aitoolsmarketer');
    const marketer = received.get('case25.test');
    assert.equal(marketer.launch_preference, 'standard_queue', 'the default fast-track sponsorship request must be deselected');
    assert.equal(marketer.pricing_model, 'paid', 'the product Paid model must remain independent of listing cost');
    assert.equal(marketer.marketing_problem, DESCRIPTION);
    assert.equal(marketer.marketing_help, 'AI Video');
    assert.equal(marketer.marketing_jobs, 'AI Video');
    assert.equal(marketer.starting_price, '', 'unknown starting prices must not be invented');
    assert.equal(marketer.website, '', 'leave the honeypot empty');
    await run('waildworld');
    assert.equal(received.get('case26.test')['tags[]'], 'Video');
    assert.equal(received.get('case26.test')['models[]'], 'Paid');
    assert.equal(received.get('case26.test').message, DESCRIPTION);
    await run('aimarketing');
    assert.equal(received.get('case27.test').tool_name, 'Test Video Tool');
    assert.equal(received.get('case27.test').tool_url, 'https://example.com');
    assert.equal(received.get('case27.test').submitter_name, 'Ada Lovelace');
    assert.ok(!visited.has('case27.test/fast-track'), 'the receipt-page paid upsell must not be opened');
    await batch.evaluate(async () => {const list=await Store.getProducts();list[0].pricing='Free Trial';await Store.saveProducts(list);});
    await run('aigclist');
    assert.equal(recordAtDraft, undefined, 'saving a draft must not record a final submission attempt');
    assert.equal(received.get('case28.test').name, 'Test Video Tool');
    assert.equal(received.get('case28.test').content, LONG_DESCRIPTION);
    assert.equal(received.get('case28.test').notes, 'The product offers a free trial.');
    assert.ok(!visited.has('case28.test/paid')&&!visited.has('case28.test/badge'), 'only Free review is selected, no paid upgrade or badge');
    const gallery = await run('a1gallery', 'Review email login:');
    assert.ok(!received.has('case29.test'), 'the bundled newsletter login requires a manual consent click');
    assert.ok(!visited.has('case29.test/auth-consent'), 'the plugin must not accept the bundled subscription automatically');
    const beforeGallery = await batch.evaluate(async () => (await Store.getProducts())[0].submissionRecords['case29.test']);
    assert.equal(beforeGallery, undefined, 'login navigation must not be recorded as a submission attempt');
    assert.equal(await gallery.locator('input[type=email]').inputValue(), 'owner@example.com');
    await gallery.getByRole('button',{name:'Continue with email →',exact:true}).click();
    await waitRun('a1gallery');
    assert.deepEqual(received.get('case29.test'), {'Site-link':'https://example.com',Creator:'',_honeypot:''});
    assert.ok(!visited.has('case29.test/paid'), 'the free website submission must never open Pro');
    await run('waildworld');
    assert.equal(received.get('case26.test')['models[]'], 'Free Trial');
    for (const [id, host, message] of [['futuretools','case14.test','Free Trial'],['aitoolslibrary','case15.test','Still required:'],['thetoolbus','case11.test','Free Trial']]) {
      const prior = received.get(host);
      await run(id, message);
      assert.equal(received.get(host), prior, 'an unsupported Free Trial model must pause instead of submitting Free or Paid');
    }
    const savedRecords = await batch.evaluate(async () => (await Store.getProducts())[0].submissionRecords);
    assert.equal(savedRecords['case11.test'].status, 'submitted');
    assert.equal(savedRecords['case11.test'].protocol.action, '/api/forms?form=ai_tool_submission');
    assert.equal(savedRecords['case12.test'].status, 'listed');
    assert.match(savedRecords['case9.test'].message, /review your tool/);
    console.log('OK: new directory adapters, review mode, free-plan selection, stale selections, excluded sites and paid/backlink guards');
  } finally {
    if (ctx) await ctx.close();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
