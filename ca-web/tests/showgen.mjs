import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 5500));
// 调 CA.showGen 触发 UI 创建
const r = await page.evaluate(() => {
  try {
    globalThis.CA.showGen(true);
    return { ok: true };
  } catch (e) { return { err: e.message }; }
});
console.log('showGen:', JSON.stringify(r));
await new Promise(r => setTimeout(r, 1500));
// 看实际 DOM
const dom = await page.evaluate(() => {
  function walk(el, depth) {
    if (!el || depth > 5) return null;
    return {
      tag: el.tagName,
      text: el.children.length === 0 ? el.textContent?.slice(0, 50) : undefined,
      size: `${el.offsetWidth}x${el.offsetHeight}`,
      children: el.children.length ? [...el.children].slice(0, 8).map(c => walk(c, depth + 1)) : undefined
    };
  }
  return walk(document.body, 0);
});
console.log('DOM:', JSON.stringify(dom, null, 2));
console.log('ERRORS:', errors.length);
errors.slice(0, 5).forEach(e => console.log(' -', e));
await page.screenshot({ path: 'tests/screenshot-showgen.png' });
await browser.close();
