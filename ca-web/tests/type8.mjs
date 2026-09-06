import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(() => {
  const cmd = globalThis.CA.cmd;
  return {
    hooked: !!cmd.__caInputHooked,
    sameEl: cmd.__caInputHookedEl === cmd.el,
    hookedElTag: cmd.__caInputHookedEl?.tagName,
    curElTag: cmd.el?.tagName,
    curConnected: !!cmd.el?.isConnected,
    hookedConnected: !!cmd.__caInputHookedEl?.isConnected
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
