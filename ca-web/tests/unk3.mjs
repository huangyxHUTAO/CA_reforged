import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const r = await page.evaluate(async () => {
  const before = document.body.innerText.slice(0, 150);
  const cmd = globalThis.CA.cmd;
  cmd.el.value = '/aaaaaa'; cmd.el.setSelectionRange(7, 7);
  cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 900));
  const after = document.body.innerText.slice(0, 400);
  return { before, after };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
