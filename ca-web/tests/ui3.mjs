import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
const logs = [];
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error' || t.includes('[ca erp]') || t.includes('[ca Error]') || t.includes('[ca-web]')) {
    logs.push(`[${m.type()}] ${t.slice(0, 300)}`);
  }
});
page.on('pageerror', e => logs.push('[PAGEERROR] ' + e.message.split('\n')[0]));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 9000));
logs.length = 0;
const r = await page.evaluate(() => {
  globalThis.CA.settings.iiMode = 3;
  globalThis.CA.showGen(true);
  // 挂个 hook 看建树到哪
  return {
    hasGen: !!globalThis.CA.gen,
    hasMain: !!globalThis.CA.gen?.mainView || !!globalThis.CA.gen,
    genType: globalThis.CA.gen?.constructor?.name,
    caCmdType: globalThis.CA.cmd?.constructor?.name,
    hasCmdDom: !!(globalThis.CA.cmd && globalThis.CA.cmd.dom)
  };
});
console.log('RESULT:', JSON.stringify(r, null, 2));
await new Promise(r => setTimeout(r, 1000));
console.log('LOGS:');
logs.slice(-25).forEach(l => console.log(' ', l));
const dom = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  return { overlayChildren: ov ? ov.childElementCount : -1 };
});
console.log('OVERLAY:', JSON.stringify(dom));
await browser.close();
