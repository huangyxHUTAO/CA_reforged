import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  const th = globalThis.java.lang.Thread;
  return {
    thType: typeof th,
    thCtor: th?.toString().slice(0, 100),
    thIsClass: typeof th === 'function' && /^class/.test(th.toString()),
    hasStart: typeof th?.prototype?.start,
    hasRun: typeof th?.prototype?.run
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
