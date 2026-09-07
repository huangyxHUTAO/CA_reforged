import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  globalThis.CA.cmd.el.value = '/summon ';
  globalThis.CA.cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 2500));
  const list = globalThis.CA.IntelliSense.list?.el;
  const path = [];
  let v = list, i = 0;
  while (v && i < 12) { path.push(v.tagName + (v.classList?.contains('ca-view') ? '.ca-view' : '')); v = v.parentElement; i++; }
  return {
    input: globalThis.CA.IntelliSense.input?.length,
    list: !!list,
    listChildren: list?.childElementCount,
    path,
    inOverlay: list ? !!document.getElementById('ca-overlay')?.contains(list) : null,
    overlayChildren: document.getElementById('ca-overlay')?.childElementCount
  };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/sa7.png' });
await browser.close();
