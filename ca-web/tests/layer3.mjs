import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('console', m => { if (m.text().includes('ca-web')) console.log(m.text()); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  // 找所有 display:none 的节点
  const allNone = [];
  const walk = (el, depth) => {
    if (depth > 8) return;
    if (getComputedStyle(el).display === 'none') {
      allNone.push({
        tag: el.tagName,
        class: el.className,
        title: el.title,
        text: el.textContent?.slice(0, 30),
        parentTag: el.parentElement?.tagName,
        parentTitle: el.parentElement?.title,
        gpTitle: el.parentElement?.parentElement?.title
      });
    }
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(ov, 0);
  return { count: allNone.length, items: allNone.slice(0, 8) };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
