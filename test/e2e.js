const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');

(async () => {
  const ext = path.resolve(__dirname, '..');
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'text/html'); res.end(fs.readFileSync(path.join(__dirname, 'fixture.html')));
  }).listen(8765);
  const ctx = await chromium.launchPersistentContext('', {
    headless: true, channel: 'chromium',
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
    viewport: { width: 1280, height: 860 }
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];
  const png = fs.readFileSync(path.join(ext, 'icons/icon128.png')).toString('base64');

  // Seed a product via the manage page, exercising the real storage path.
  const manage = await ctx.newPage();
  await manage.goto(`chrome-extension://${extId}/src/manage.html`);
  await manage.evaluate(async (png) => {
    await Store.upsertProduct({
      name: 'H3 Max', url: 'https://h3max.pro', email: 'support@h3max.pro',
      description: 'Generate AI video in a few seconds. Turn prompts into cinematic clips.',
      useCases: 'Marketing videos\nSocial clips', features: 'Text to video\n1080p export',
      tags: 'AI Video, Productivity', tagline: 'Turn prompts into cinematic clips.', logo: { data: 'data:image/png;base64,' + png, name: 'logo.png' },
      hero: { data: 'data:image/png;base64,' + png, name: 'hero.png' }
    });
    await Store.upsertProduct({ name: 'Aniv AI', url: 'https://aniv.ai', email: 'support@aniv.ai', description: 'AI short dramas.' });
  }, png);
  await manage.reload();
  await manage.waitForTimeout(300);
  await manage.screenshot({ path: path.join(__dirname, 'shot-manage.png') });
  await manage.click('#add');
  await manage.waitForTimeout(200);
  await manage.screenshot({ path: path.join(__dirname, 'shot-dialog.png') });

  const page = await ctx.newPage();
  await page.goto('http://localhost:8765/');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'shot-launcher.png') });
  // Click the launcher (inside a closed shadow root; click by coordinates).
  const box = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  await page.mouse.click(box.w - 12, box.h * 0.62 + 23);
  await page.waitForTimeout(800);
  const panel = page.frames().find((f) => f.url().includes('panel.html'));
  if (!panel) throw new Error('panel not opened');
  await page.screenshot({ path: path.join(__dirname, 'shot-panel.png') });
  await panel.click('#autofill');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'shot-filled.png'), fullPage: true });
  const vals = await page.evaluate(() => {
    const f = document.getElementById('f');
    const o = {};
    for (const el of f.elements) if (el.name) o[el.name] = el.type === 'file' ? [...el.files].map((x) => x.name + ':' + x.size) : el.value;
    o.checks = [...f.querySelectorAll('input[type=checkbox]')].map((c) => c.value + '=' + c.checked);
    o.rich = f.querySelector('[contenteditable]').textContent;
    return o;
  });
  console.log(JSON.stringify(vals, null, 2));
  const shortVals = await page.evaluate(() =>
    Object.fromEntries([...document.getElementById('short').elements].map((el) => [el.name, el.value])));
  console.log('short-description variants:', JSON.stringify(shortVals, null, 2));
  const TAGLINE = 'Turn prompts into cinematic clips.';
  const DESCRIPTION = 'Generate AI video in a few seconds. Turn prompts into cinematic clips.';
  const failures = Object.entries(shortVals)
    .filter(([k, v]) => v !== (k === 'long' ? DESCRIPTION : TAGLINE))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  // maxlength=40 on this field is longer than the tagline, so it must arrive intact.
  if (vals.short_desc !== TAGLINE) failures.push(`short_desc=${vals.short_desc}`);
  if (failures.length) { console.error('FAILED:', failures.join(', ')); process.exitCode = 1; }
  else console.log('all short-description variants received the tagline');
  console.log('panel result:', await panel.$eval('#resultHead', (e) => e.textContent));
  await ctx.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
