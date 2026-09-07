import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  const out = [];
  const walk = (el, depth, path) => {
    if (depth > 10) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') {
      out.push({ path, text: el.textContent?.slice(0, 40) });
    }
    for (const c of el.children) walk(c, depth + 1, path + ' > ' + c.tagName);
  };
  walk(ov, 0, 'overlay');
  return { hiddenCount: out.length, items: out };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
