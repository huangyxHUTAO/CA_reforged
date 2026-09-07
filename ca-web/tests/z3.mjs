import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 600 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
await page.evaluate(() => {
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') el.style.setProperty('display', 'block', 'important');
  });
});
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: 'tests/z3.png' });
const r = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  return { rootKids: ov?.firstElementChild?.childElementCount, text: document.body.innerText.slice(0, 200) };
});
console.log(JSON.stringify(r));
await browser.close();
