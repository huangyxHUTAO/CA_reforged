import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
// 强制所有 display:none → block
await page.evaluate(() => {
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') el.style.setProperty('display', 'block', 'important');
  });
});
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: 'tests/z2.png', fullPage: true });
const ov = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  const root = ov?.firstElementChild;
  return { w: root?.offsetWidth, h: root?.offsetHeight, kids: root?.childElementCount, text: document.body.innerText.slice(0, 200) };
});
console.log(JSON.stringify(ov));
await browser.close();
