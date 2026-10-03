import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox'], protocolTimeout: 25000
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

// 记录 main.setTranslationY 的所有调用
await page.evaluate(() => {
  const main = globalThis.CA.showGen.main;
  window.__tyCalls = [];
  const orig = main.setTranslationY.bind(main);
  main.setTranslationY = (y) => { window.__tyCalls.push(Math.round((y || 0) * 100) / 100); return orig(y); };
  // 同时记录引擎 touch 链收到的 action 序列
  window.__actions = [];
  const el = globalThis.CA.cmd.el;
  for (const t of ['pointerdown', 'pointermove', 'pointerup']) {
    el.addEventListener(t, (e) => window.__actions.push(t + '@' + Math.round(e.clientX) + ',' + Math.round(e.clientY)), true);
  }
});

const pos = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  const rc = el.getBoundingClientRect();
  return { x: Math.round(rc.x + rc.width / 2), y: Math.round(rc.y + rc.height / 2) };
});

// 一次普通点击（按下到抬起 60ms，不移动）
await page.mouse.move(pos.x, pos.y);
await new Promise(r => setTimeout(r, 200));
await page.mouse.down();
await new Promise(r => setTimeout(r, 60));
await page.mouse.up();
await new Promise(r => setTimeout(r, 600));

const out = await page.evaluate(() => ({
  tyCalls: window.__tyCalls,
  nonZeroTy: window.__tyCalls.filter(v => v !== 0),
  actions: window.__actions,
  mainTransform: getComputedStyle(globalThis.CA.showGen.main.el).transform
}));
console.log('after plain click:', JSON.stringify(out, null, 1));
await browser.close();