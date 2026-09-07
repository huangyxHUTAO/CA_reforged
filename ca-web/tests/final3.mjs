import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
// 输入 /summon 看补全弹在内容区
await page.evaluate(() => { const c = globalThis.CA?.cmd; if (c?.el) { c.el.focus(); c.el.value='/summon '; c.el.dispatchEvent(new Event('input',{bubbles:true})); } });
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  const bar = globalThis.CA?.showGen?.bar?.el;
  const rc = bar?.getBoundingClientRect();
  return {
    barRect: rc ? { y: rc.y|0, h: rc.height|0, w: rc.width|0, visible: rc.top < innerHeight && rc.bottom > 0 } : null,
    text: document.body.innerText.slice(0, 200)
  };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/final3.png' });
await browser.close();
