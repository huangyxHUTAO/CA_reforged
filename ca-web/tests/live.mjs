import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[PAGEERROR]', e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && m.text().includes('[ca erp]')) console.log('[erp]', m.text().slice(0, 150)); });
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const r = await page.evaluate(async () => {
  const out = { text: document.body.innerText.slice(0, 300) };
  // 顶层可见矩形集合
  const ov = document.getElementById('ca-overlay');
  const vis = [];
  function walk(el, d) {
    if (d > 4 || !el) return;
    const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
    if (cs.display !== 'none' && cs.visibility !== 'hidden' && rc.width > 5 && rc.height > 5 && el.children.length === 0) {
      vis.push({ text: el.textContent.trim().slice(0, 40), x: rc.x|0, y: rc.y|0, w: rc.width|0, h: rc.height|0 });
    }
    [...el.children].forEach(c => walk(c, d+1));
  }
  walk(ov, 0);
  return { ...out, visibleLeaves: vis.slice(0, 20) };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/live.png' });
await browser.close();
