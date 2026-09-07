import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(() => {
  const I = globalThis.Intl;
  return {
    localesLen: I?.locales?.length,
    currentLocIndex: I?.currentLocIndex,
    nsKeys: I?.namespaces ? Object.keys(I.namespaces).slice(0, 6) : null,
    commonOk: I?.namespaces?.common?.ok,
    getDataCommon: I?.getData ? I.getData('common.ok') : null
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
