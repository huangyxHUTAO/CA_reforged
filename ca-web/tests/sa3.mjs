import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { if (m.text().includes('ca erp')) console.log(m.text().slice(0, 200)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  globalThis.CA.cmd.el.value = '/summon ';
  globalThis.CA.cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 800));
  return {
    ui: globalThis.CA.IntelliSense.ui?.constructor?.name,
    conDom: globalThis.CA.showAssist.con?.el?.childElementCount ?? -1,
    listAttached: !!globalThis.CA.showAssist.con?.el?.children?.[0],
    listInOverlay: !!globalThis.CA.IntelliSense.list?.el?.isConnected,
    listInDoc: !!globalThis.CA.IntelliSense.list?.el?.parentElement?.tagName
  };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/sa3.png' });
await browser.close();
