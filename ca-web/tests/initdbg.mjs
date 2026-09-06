import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
page.on('console', m => {
  const t = m.text();
  if (t.includes('[') && (t.includes('ca-web') || t.includes('ca Error') || t.includes('ca erp') || t.includes('ca loading'))) {
    console.log(t.slice(0, 200));
  }
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 8000));
const r = await page.evaluate(() => ({
  loadingStatus: globalThis.CA?.Library?.loadingStatus,
  enabledCount: globalThis.CA?.settings?.enabledLibrarys?.length,
  enabledLibs: globalThis.CA?.settings?.enabledLibrarys,
  innerCount: globalThis.CA?.Library?.inner ? Object.keys(globalThis.CA.Library.inner).length : 0,
  isLib: !!globalThis.CA?.IntelliSense?.library,
  libCommandsCount: globalThis.CA?.IntelliSense?.library?.commands ? Object.keys(globalThis.CA.IntelliSense.library.commands).length : 0
}));
console.log('STATE:', JSON.stringify(r, null, 2));
await browser.close();
