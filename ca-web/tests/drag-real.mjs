import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox'], protocolTimeout: 25000
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
await page.evaluate(() => {
  const main = globalThis.CA.showGen.main;
  window.__ty = [];
  const orig = main.setTranslationY.bind(main);
  main.setTranslationY = (y) => { window.__ty.push(Math.round(y || 0)); return orig(y); };
});
const pos = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  const rc = el.getBoundingClientRect();
  return { x: Math.round(rc.x + rc.width / 2), y: Math.round(rc.y + rc.height / 2) };
});

// 1) 点击（不移动）→ 不应拖动
await page.mouse.move(pos.x, pos.y);
await page.mouse.down();
await new Promise(r => setTimeout(r, 60));
await page.mouse.up();
await new Promise(r => setTimeout(r, 400));
let r1 = await page.evaluate(() => ({ nonZero: window.__ty.filter(v => v !== 0), transform: getComputedStyle(globalThis.CA.showGen.main.el).transform }));
console.log('click (no move) nonZero ty:', JSON.stringify(r1.nonZero), 'transform:', r1.transform);

// 2) 真拖动（按下后上移 120px）→ 应触发 setTranslationY
await page.evaluate(() => { window.__ty = []; });
await page.mouse.move(pos.x, pos.y);
await page.mouse.down();
for (let i = 1; i <= 6; i++) {
  await page.mouse.move(pos.x, pos.y - i * 20);
  await new Promise(r => setTimeout(r, 25));
}
const during = await page.evaluate(() => ({ ty: window.__ty.slice() }));
await page.mouse.up();
await new Promise(r => setTimeout(r, 400));
const r2 = await page.evaluate(() => ({ ty: window.__ty.slice(), transform: getComputedStyle(globalThis.CA.showGen.main.el).transform }));
console.log('drag ty calls:', JSON.stringify(during.ty), '→ final:', JSON.stringify(r2.ty), 'transform:', r2.transform);
await browser.close();