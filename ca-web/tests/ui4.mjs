import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error') console.log('[console.error]', t.slice(0, 500));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 9000));
// hook erp 拿堆栈
await page.evaluate(() => {
  const orig = globalThis.erp;
  globalThis.__stacks = [];
  globalThis.erp = function (e) {
    globalThis.__stacks.push({ msg: e?.message || String(e), stack: (e?.stack || '').split('\n').slice(0, 6).join(' | ') });
    return orig.apply(this, arguments);
  };
});
await page.evaluate(() => { globalThis.CA.settings.iiMode = 3; globalThis.CA.showGen(true); });
await new Promise(r => setTimeout(r, 1000));
const stacks = await page.evaluate(() => globalThis.__stacks);
console.log('STACKS:');
stacks.forEach(s => console.log(' -', s.msg, '\n   ', s.stack));
const dom = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  return { overlayChildren: ov ? ov.childElementCount : -1 };
});
console.log('OVERLAY:', JSON.stringify(dom));
await browser.close();
