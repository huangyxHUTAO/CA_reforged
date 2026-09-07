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
  const out = { text: document.body.innerText.slice(0, 500) };
  // 可视区域叶节点
  const ov = document.getElementById('ca-overlay');
  const vis = [];
  function walk(el, d) {
    if (d > 7 || !el || el.tagName === 'SCRIPT') return;
    const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
    const leaf = el.children.length === 0;
    if (cs.display !== 'none' && cs.visibility !== 'hidden' && rc.width > 3 && rc.height > 3 && (leaf || cs.position === 'relative' || cs.position === 'static')) {
      if (leaf || el.dataset.caUid) {
        vis.push({ t: el.textContent.trim().slice(0, 26), x: rc.x|0, y: rc.y|0, w: rc.width|0, h: rc.height|0, tag: el.tagName, disp: cs.display });
      }
    }
    [...el.children].forEach(c => walk(c, d+1));
  }
  walk(ov, 0);
  return { ...out, leaves: vis.slice(0, 25) };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/live2.png' });
await browser.close();
