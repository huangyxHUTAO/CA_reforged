import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const info = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  const rc = el.getBoundingClientRect();
  window.__mdlog = [];
  document.addEventListener('mousedown', (e) => {
    window.__mdlog.push({ at: Date.now()%100000, t: e.target===el?'TA':(e.target.tagName||'?'), prev: e.defaultPrevented, phase: 'capture', inTa: e.target===el });
  }, true);
  // 再注册 capture 之后：bubble 阶段看 defaultPrevented 是否被改
  document.addEventListener('mousedown', (e) => {
    window.__mdlog.push({ at: Date.now()%100000, t: e.target===el?'TA':(e.target.tagName||'?'), prev: e.defaultPrevented, phase: 'bubble' });
  }, false);
  // 枚举 el 祖先的 onmousedown / addEventListener('mousedown') 原型 hook 难，先看祖先 inline onclick 等
  const chain = [];
  let n = el;
  while (n && n !== document.body) {
    const has = {
      tag: n.tagName,
      onmd: typeof n.onmousedown, onpd: typeof n.onpointerdown,
      onck: typeof n.onclick,
    };
    chain.push(has);
    n = n.parentElement;
  }
  return { x: rc.x+rc.width/2, y: rc.y+rc.height/2, chain };
});
await page.mouse.click(info.x, info.y);
await new Promise(r => setTimeout(r, 300));
const r = await page.evaluate(() => ({ log: window.__mdlog }));
console.log(JSON.stringify({ ...info, ...r }, null, 2));
await browser.close();
