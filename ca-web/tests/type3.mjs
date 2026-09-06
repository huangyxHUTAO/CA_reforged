import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('[err]', m.text().slice(0, 300)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  const out = {};
  // 直接 proc（已知 273）对照
  try {
    globalThis.CA.IntelliSense.proc('/summon ', 8);
    out.procDirect = globalThis.CA.IntelliSense.input?.length ?? -1;
  } catch (e) { out.procDirect = e.message; }
  // 直接 callDelay
  try {
    globalThis.CA.IntelliSense.callDelay('/summon ', 8);
    await new Promise(r2 => setTimeout(r2, 400));
    out.afterCallDelay = globalThis.CA.IntelliSense.input?.length ?? -1;
  } catch (e) { out.callDelayErr = e.message; }
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
