import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
const errors = [];
page.on('pageerror', e => errors.push('[ERR] ' + e.message.split('\n')[0]));
page.on('console', m => {
  const t = m.text();
  if (t.includes('[ca-web]')) console.log(t);
  if (m.type() === 'error' && !t.includes('vite')) errors.push('[console] ' + t.slice(0, 150));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 9000));
// 尝试 showGen
const r = await page.evaluate(() => {
  try {
    globalThis.CA.settings.iiMode = 3;
    globalThis.CA.showGen(true);
    return { ok: true };
  } catch (e) { return { err: e.message, stack: e.stack?.slice(0, 300) }; }
});
console.log('showGen:', JSON.stringify(r));
await new Promise(r => setTimeout(r, 2000));
// 看 DOM
const dom = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  return {
    overlayChildren: ov ? ov.childElementCount : -1,
    overlayHTML: ov ? ov.innerHTML.slice(0, 1500) : '(no overlay)',
    bodyHTML: document.body.innerHTML.slice(0, 500)
  };
});
console.log('DOM:', JSON.stringify(dom, null, 2));
console.log('ERRORS:', errors.length);
errors.slice(0, 8).forEach(e => console.log(' -', e));
await browser.close();
