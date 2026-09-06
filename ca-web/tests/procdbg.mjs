import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
page.on('console', m => {
  if (m.type() === 'error' || m.text().includes('[ca Error') || m.text().includes('[ca erp')) {
    console.log(m.text().slice(0, 250));
  }
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 8000));
const r = await page.evaluate(() => {
  const IS = globalThis.CA.IntelliSense;
  globalThis.CA.settings.iiMode = 3;
  // 直接调 procCmd
  try {
    const r = IS.procCmd('/summon ', 8);
    return { ok: true, cmdname: r.cmdname, inputCount: r.input?.length };
  } catch (e) { return { err: e.message, stack: e.stack?.slice(0, 400) }; }
});
console.log('PROCMD:', JSON.stringify(r, null, 2));
await browser.close();
