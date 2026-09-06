import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on('console', m => { if (m.type() === 'error') console.log('[err]', m.text().slice(0, 200)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 9000));
const r = await page.evaluate(() => {
  globalThis.__caDebugWM = true;
  const out = {};
  try {
    globalThis.CA.settings.iiMode = 3;
    globalThis.CA.showGen(true);
    out.showGen = 'ok';
  } catch (e) { out.showGen = e.message + ' @ ' + (e.stack || '').split('\n')[1]; }
  try {
    if (globalThis.CA.gen) {
      globalThis.CA.gen.enter();
      out.enter = 'ok';
    } else out.enter = 'no-gen';
  } catch (e) { out.enter = e.message + ' @ ' + (e.stack || '').split('\n').slice(0, 4).join(' | '); }
  out.overlay = document.getElementById('ca-overlay')?.childElementCount ?? -1;
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
