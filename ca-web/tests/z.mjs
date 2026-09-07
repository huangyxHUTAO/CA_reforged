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
  const ca = document.querySelector('ca-app');
  const sr = ca?.shadowRoot;
  return {
    caOuterHTML: ca?.outerHTML?.slice(0, 400),
    srInnerHTML: sr?.innerHTML?.slice(0, 400),
    srChildren: sr ? [...sr.children].map(c => ({ tag: c.tagName, html: c.outerHTML?.slice(0, 200) })) : null,
    bodyText: document.body.innerText.slice(0, 100)
  };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/z.png' });
await browser.close();
