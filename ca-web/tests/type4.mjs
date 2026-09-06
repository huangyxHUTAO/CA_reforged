import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('[err]', m.text().slice(0, 250)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  const out = {};
  // textUpdate 在 CA.gen 闭包？找 self —— CA.gen.mainView 的 owner。
  // showGen 里 self = CA（static self）。textUpdate 挂 CA.textUpdate? 查
  out.tuOnCA = typeof globalThis.CA.textUpdate;
  // 若在闭包内拿不到 —— 用 gen 页对象找
  const gen = globalThis.CA.gen;
  out.genKeys = gen ? Object.keys(gen).slice(0, 15) : null;
  out.tuOnGen = gen ? typeof gen.textUpdate : null;
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
