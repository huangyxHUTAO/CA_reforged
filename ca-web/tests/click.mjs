import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const r = await page.evaluate(async () => {
  const cmd = globalThis.CA?.cmd;
  const el = cmd?.el;
  if (!el) return { err: 'no textarea' };
  const rc = el.getBoundingClientRect();
  const cx = Math.round(rc.x + rc.width/2), cy = Math.round(rc.y + rc.height/2);
  // 层叠排查：从根向下找该点命中的节点链
  const hit = document.elementFromPoint(cx, cy);
  const chain = [];
  let n = hit;
  while (n) { chain.push(`${n.tagName}${n.className?'.'+String(n.className).trim().slice(0,15):''}${n===el?' <TARGET>':''} pe=${getComputedStyle(n).pointerEvents}`); n = n.parentElement; }
  return {
    textareaRect: { x: rc.x|0, y: rc.y|0, w: rc.width|0, h: rc.height|0 },
    point: { cx, cy },
    hitTop: hit === el ? 'textarea' : (hit?.tagName || 'none'),
    chain: chain.slice(0, 12)
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
