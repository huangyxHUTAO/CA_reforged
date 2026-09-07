import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
// 等久
await new Promise(r => setTimeout(r, 12000));
const r = await page.evaluate(async () => {
  globalThis.CA.cmd.el.value = '/summon ';
  globalThis.CA.cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 2500));
  return {
    listInDoc: globalThis.CA.IntelliSense.list?.el?.parentElement?.tagName,
    grandParent: globalThis.CA.IntelliSense.list?.el?.parentElement?.parentElement?.tagName,
    inOverlay: !!document.getElementById('ca-overlay')?.contains(globalThis.CA.IntelliSense.list?.el),
    overlayChildren: document.getElementById('ca-overlay')?.childElementCount,
    listText: globalThis.CA.IntelliSense.list?.el?.innerText?.slice(0, 200)
  };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/sa4.png' });
await browser.close();
