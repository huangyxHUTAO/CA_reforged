import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 8000));
const r = await page.evaluate(() => {
  const inner = globalThis.CA?.Library?.inner;
  const lib = globalThis.CA?.IntelliSense?.library;
  return {
    innerDefaultCommands: inner?.default?.commands ? Object.keys(inner.default.commands).length : null,
    libCommands: lib?.commands ? Object.keys(lib.commands).length : null,
    innerSample: inner?.default?.commands ? Object.keys(inner.default.commands).slice(0, 5) : null
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
