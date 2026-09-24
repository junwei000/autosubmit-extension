// Renders icons/logo.svg into the PNG sizes required by the manifest.
// Usage: node scripts/render-icons.js   (requires `playwright` with Chromium)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const svg = fs.readFileSync(path.join(__dirname, '..', 'icons', 'logo.svg'), 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">` +
      svg.replace('width="128" height="128"', `width="${size}" height="${size}"`) +
      `</body></html>`
    );
    await page.screenshot({
      path: path.join(__dirname, '..', 'icons', `icon${size}.png`),
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size }
    });
  }
  await browser.close();
  console.log('icons rendered');
})();
