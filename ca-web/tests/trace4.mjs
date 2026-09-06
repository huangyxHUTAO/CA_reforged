import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => {
  const t = m.text();
  if (!t.includes('vite') && !t.includes('Lit is') && !t.includes('[ca Debug]')) console.log(`[${m.type()}] ${t.slice(0, 250)}`);
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 3000));
// 在浏览器里手动跑 init
const r = await page.evaluate(() => {
  const origErr = globalThis.erp;
  globalThis.__erpLog = [];
  globalThis.erp = (e, silent, extra) => {
    globalThis.__erpLog.push({ msg: e?.message || String(e), stack: e?.stack?.slice(0, 300) });
    return origErr(e, silent, extra);
  };
  try {
    if (globalThis.MapScript) {
      globalThis.MapScript.initialize();
    }
    return { ok: true, erp: globalThis.__erpLog };
  } catch (e) { return { err: e.message, erp: globalThis.__erpLog }; }
});
console.log('RESULT:', JSON.stringify(r, null, 2));
await browser.close();
