import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
const errs = [];
page.on('pageerror', e => errs.push('[ERR] ' + e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 9000));
const r = await page.evaluate(() => {
  try {
    globalThis.CA.settings.iiMode = 3;
    globalThis.CA.showGen(true);
    // 触发 gen 页面显示
    if (globalThis.CA.gen && globalThis.CA.gen.show) globalThis.CA.gen.show();
    else if (globalThis.PopupPage && globalThis.PopupPage.show) globalThis.PopupPage.show();
    return { ok: true, hasGen: !!globalThis.CA.gen, genKeys: globalThis.CA.gen ? Object.keys(globalThis.CA.gen) : null };
  } catch (e) { return { err: e.message, stack: e.stack?.slice(0, 300) }; }
});
console.log('SHOW:', JSON.stringify(r, null, 2));
await new Promise(r => setTimeout(r, 1500));
const dom = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  return {
    overlayChildren: ov ? ov.childElementCount : -1,
    overlaySnippet: ov ? ov.innerHTML.slice(0, 2000) : '(none)'
  };
});
console.log('DOM:', JSON.stringify(dom, null, 2));
console.log('ERRORS:', errs.length);
errs.slice(0, 6).forEach(e => console.log(' -', e));
await browser.close();
