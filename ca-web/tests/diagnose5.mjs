import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[PAGEERROR]', e.message.split('\n')[0]));
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  const result = await page.evaluate(() => {
    const ms = globalThis.MapScript;
    const r1 = ms.loadModule('Test1', { x: 1 });
    return {
      hasMS: !!ms,
      loadModuleResult: r1,
      test1: typeof globalThis.Test1,
      modulesArr: ms.modules.slice(0, 20)
    };
  });
  console.log('TEST:', JSON.stringify(result, null, 2));
} catch (e) { console.log('GOTO ERROR:', e.message); }
await browser.close();
