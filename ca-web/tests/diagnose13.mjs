import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  const r = await page.evaluate(() => {
    const orig = globalThis.Intl;
    // 尝试覆盖
    try {
      globalThis.Intl = { custom: 1 };
    } catch (e) { return { err: e.message }; }
    return {
      assigned: typeof globalThis.Intl.custom,
      isOrig: globalThis.Intl === orig,
      desc: Object.getOwnPropertyDescriptor(globalThis, 'Intl')
    };
  });
  console.log('TEST:', JSON.stringify(r, null, 2));
} catch (e) { console.log('GOTO:', e.message); }
await browser.close();
