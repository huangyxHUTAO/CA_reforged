import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 6000));
const dom = await page.evaluate(() => {
  function walk(el, depth) {
    if (!el || depth > 4) return null;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      text: el.children.length === 0 ? el.textContent?.slice(0, 50) : undefined,
      size: el.offsetWidth + 'x' + el.offsetHeight,
      color: cs.color, bg: cs.backgroundColor,
      children: el.children.length ? [...el.children].slice(0, 6).map(c => walk(c, depth+1)) : undefined
    };
  }
  return walk(document.body, 0);
});
console.log(JSON.stringify(dom, null, 2));
await browser.close();
