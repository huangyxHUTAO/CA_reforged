import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
// 找可点元素文本
const r0 = await page.evaluate(() => {
  const vis = [];
  const ov = document.getElementById('ca-overlay');
  function walk(el, d) {
    if (d > 8) return;
    const cs = getComputedStyle(el);
    const rc = el.getBoundingClientRect();
    const t = (el.textContent || '').trim();
    if (cs.display !== 'none' && rc.width > 2 && rc.height > 2 && t.length > 0 && t.length < 20 && el.children.length === 0) {
      vis.push({ t, x: rc.x|0, y: rc.y|0, w: rc.width|0, h: rc.height|0, tag: el.tagName });
    }
    [...el.children].forEach(c => walk(c, d+1));
  }
  walk(ov, 0);
  return vis;
});
console.log('VISIBLE TEXT NODES:', JSON.stringify(r0, null, 2));
// 尝试点 ╋
const btn = await page.evaluate(() => {
  const all = [...document.querySelectorAll('span,button')];
  const el = all.find(e => e.textContent.trim() === '╋' && getComputedStyle(e).display !== 'none');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width/2, y: r.y + r.height/2 };
});
console.log('╋ at:', JSON.stringify(btn));
if (btn) { await page.mouse.click(btn.x, btn.y); await new Promise(r => setTimeout(r, 1200)); }
const after = await page.evaluate(() => document.body.innerText.slice(0, 400));
console.log('AFTER ╋ CLICK:\n', JSON.stringify(after));
await page.screenshot({ path: 'tests/interact.png' });
await browser.close();
