// End-to-end for the sign-up flow: the directory asks for a code, the plugin reads it from Gmail (a stand-in
// for the real inbox) and writes it back, then fills and submits the form.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ext = path.resolve(__dirname, '..');
const fixture = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const CODE = '483921';

// The extension plus one directory of our own, so the test does not need a live site.
function extWithTestSite() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autosubmit-'));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.copyFileSync(path.join(ext, 'manifest.json'), path.join(dir, 'manifest.json'));
  for (const f of fs.readdirSync(path.join(ext, 'src'))) {
    fs.copyFileSync(path.join(ext, 'src', f), path.join(dir, 'src', f));
  }
  fs.cpSync(path.join(ext, 'icons'), path.join(dir, 'icons'), { recursive: true });
  const site = `  {
    id: 'codesite',
    name: 'Code Site',
    domain: 'codesite.test',
    url: 'https://codesite.test/signup',
    login: 'email',
    form: 'form:has([name=url])',
    submit: /^submit tool$/i,
    fill: { '[name=toolName]': 'name', '[name=website]': 'url', '[name=about]': 'description' },
    note: { en: 'test site', zh: 'test site' },
  },
`;
  const file = path.join(dir, 'src', 'sites.js');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('const SITES = [', `const SITES = [\n${site}`)
    .replace("domain: 'webcatalog.io'", "domain: 'webcatalog.test'")
    .replace("url: 'https://webcatalog.io/en/apps/submit'", "url: 'https://webcatalog.test/en/apps/submit'"));
  return dir;
}

// A stand-in for the inbox: one row with the code, and the mail body.
function gmailMail(site = 'codesite.test') {
  return `<!doctype html><html><body>
    <table><tbody>
      <tr class="zA" onclick="document.querySelector('.a3s').textContent='Unrelated service code 901234'">
        <td class="xW"><span title="${new Date().toUTCString()}">today</span></td><td>another-service.test</td><td>Forwarded to ada@example.com. Code 901234</td></tr>
      <tr class="zA" onclick="document.querySelector('.a3s').textContent='Stale code 111222'">
        <td class="xW"><span title="${new Date(Date.now()-2*86400000).toUTCString()}">old</span></td><td>${site}</td><td>Old verification code 111222</td></tr>
      <tr class="zA" onclick="document.querySelector('.a3s').textContent='Your verification code is ${CODE}. Expires in 10 minutes.'">
        <td class="xW"><span title="${new Date(Date.now()-1000).toUTCString()}">today</span></td>
        <td data-site>no-reply@${site}</td>
        <td data-site>${site} account verification</td>
        <td>Your verification code is ${CODE}</td>
      </tr>
    </tbody></table>
    <div role="main"><div class="a3s"></div></div>
    <script>if(decodeURIComponent(location.hash).includes('webcatalog.test'))document.querySelectorAll('[data-site],tr.zA:nth-child(2) td').forEach(e=>e.textContent=e.textContent.replaceAll('${site}','webcatalog.test'));if(!decodeURIComponent(location.hash).includes('in:anywhere'))document.querySelector('[data-site]')?.closest('tr').remove();</script>
  </body></html>`;
}

const DESCRIPTION =
  'RTFV is an online tool that removes burned-in subtitles, captions, timestamps, logos, and watermarks from ' +
  'video using AI. Upload a clip, choose how to find the text, and download a version with the original frame ' +
  'intact. There is nothing to install and no timeline to learn.';

(async () => {
  const dir = extWithTestSite();
  const ctx = await chromium.launchPersistentContext('', {
    headless: true, channel: 'chromium',
    args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`],
    viewport: { width: 1280, height: 860 },
  });
  const html = (body) => ({ status: 200, contentType: 'text/html', body });
  await ctx.route('https://codesite.test/**', (route) => route.fulfill(html(fixture('fixture-verify.html'))));
  await ctx.route('https://webcatalog.test/**', route => route.fulfill(html(fixture('fixture-webcatalog-auth.html'))));
  const gmailSearches = [];
  await ctx.route('https://mail.google.com/**', (route) => {
    const url = decodeURIComponent(route.request().url());
    gmailSearches.push(url);
    return route.fulfill(html(gmailMail(url.includes('webcatalog.test') ? 'webcatalog.test' : 'codesite.test')));
  });

  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];
  const png = fs.readFileSync(path.join(ext, 'icons/icon128.png')).toString('base64');

  const batch = await ctx.newPage();
  await batch.goto(`chrome-extension://${extId}/src/batch.html`);
  const productId = await batch.evaluate(async (png) => {
    const p = await Store.upsertProduct({
      name: 'Remove Text From Video', url: 'https://rtfv.app', email: 'support@rtfv.app',
      tagline: 'Remove burned-in subtitles, captions, timestamps, logos and watermarks from video with AI.',
      description: 'RTFV is an online tool that removes burned-in subtitles, captions, timestamps, logos, and watermarks from video using AI. Upload a clip, choose how to find the text, and download a version with the original frame intact. There is nothing to install and no timeline to learn.',
      useCases: 'Clean up clips before translating or reusing them',
      features: 'Auto and Box select modes\nTemporal inpainting', tags: 'AI Video, Video Editing',
      pricing: 'Paid', logo: { data: 'data:image/png;base64,' + png, name: 'logo.png' },
    });
    await Store.saveSubmitter({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', password: 'Str0ngPass!23' });
    await Store.saveSettings({ batchProductId: p.id, autoSubmit: true, autoAgree: true, lang: 'en' });
    return p.id;
  }, png);
  await batch.reload();

  ctx.on('page', async (p) => {
    p.on('framenavigated', frame => { if (frame.url().startsWith('https://mail.google.com/')) gmailSearches.push(decodeURIComponent(frame.url())); });
    await p.waitForLoadState('domcontentloaded').catch(() => {});
    if (p.url().includes('codesite.test') && !p.__rerouted) {
      p.__rerouted = true;
      await p.goto('https://codesite.test/signup').catch(() => {});
    }
    if (p.url().includes('webcatalog.test') && !p.__rerouted) {
      p.__rerouted = true;
      await p.goto('https://webcatalog.test/en/apps/submit').catch(() => {});
    }
  });
  const res = await batch.evaluate((m) => chrome.runtime.sendMessage(m), { type: 'startRun', productId, ids: ['codesite'] });
  if (res && res.error) throw new Error(res.error);

  let run;
  for (let i = 0; i < 90; i++) {
    await batch.waitForTimeout(1000);
    run = await batch.evaluate(async () => (await chrome.storage.local.get('run')).run);
    if (!run.active) break;
  }
  console.log('run:', JSON.stringify({ status: run.status, info: run.info }, null, 2));

  const page = await ctx.newPage();
  await page.goto('https://codesite.test/signup');
  const got = await page.evaluate(() => JSON.parse(localStorage.getItem('submitted') || 'null'));
  await page.close();
  console.log('site received:', JSON.stringify(got, null, 2));

  const failures = [];
  if (!got) failures.push('the form was never submitted');
  if (got && got.code !== CODE) failures.push(`the code was not written back (${got.code})`);
  if (got && got.email !== 'ada@example.com') failures.push(`sign-up e-mail: ${got.email}`);
  if (got && got.toolName !== 'Remove Text From Video') failures.push(`tool name: ${got.toolName}`);
  if (got && got.website !== 'https://rtfv.app') failures.push(`website: ${got.website}`);
  if (got && got.about !== DESCRIPTION) {
    failures.push(`description: len ${(got.about || '').length} vs ${DESCRIPTION.length} :: ${JSON.stringify((got.about || '').slice(-40))}`);
  }
  if (run.status.codesite !== 'done') failures.push(`run status ${JSON.stringify(run.status)}`);

  if (failures.length) { console.error('FAILED:\n  ' + failures.join('\n  ')); process.exitCode = 1; }
  else console.log('OK: signed up, read the code from Gmail, wrote it back and submitted the form');
  // Actual WebCatalog adapter: email-only auth, forwarded Gmail OTP and automatic login on the last digit.
  await batch.evaluate(productId => chrome.runtime.sendMessage({type:'startRun',productId,ids:['webcatalog']}), productId);
  for (let i=0; i<90; i++) {
    await batch.waitForTimeout(1000);
    run = await batch.evaluate(async () => (await chrome.storage.local.get('run')).run);
    if (!run.active) break;
  }
  const web = await ctx.newPage();
  await web.goto('https://webcatalog.test/en/apps/submit');
  const authResult = await web.evaluate(() => ({email:localStorage.getItem('account-email'),sent:JSON.parse(localStorage.getItem('recommendation')||'null'),premature:localStorage.getItem('premature-click'),google:localStorage.getItem('wrong-google-account')}));
  if (run.status.webcatalog!=='done' || authResult.email!=='ada@example.com' || authResult.sent?.appName!=='Remove Text From Video' || authResult.sent?.url!=='https://rtfv.app' || authResult.premature || authResult.google) throw new Error('WebCatalog email auth failed: '+JSON.stringify({authResult,info:run.info.webcatalog}));
  if (!gmailSearches.some(q=>q.includes('webcatalog.test')&&q.includes('to:ada@example.com')&&q.includes('after:'))) throw new Error('Gmail search must match account, site and request time');
  if (!gmailSearches.some(q=>q.includes('webcatalog.test')&&q.includes('in:anywhere'))) throw new Error('Verification search must include Spam while retaining site/account/time constraints');
  console.log('OK: forwarded Gmail OTP excludes newer unrelated/stale messages; email-only login auto-completes before the recommendation form');
  await ctx.close();
})().catch((e) => { console.error(e); process.exit(1); });
