import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { if (m.text().includes('probe')) console.log(m.text().slice(0, 250)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  const out = {};
  const SA = globalThis.CA.showAssist;
  console.log('probe: initContent type =', typeof SA.initContent, ' con =', !!SA.con, ' linear=', !!SA.linear);
  try { globalThis.CA.IntelliSense.show(); } catch (e) { console.log('probe: show threw', e.message); }
  await new Promise(r2 => setTimeout(r2, 400));
  console.log('probe: after show — ui=', !!globalThis.CA.IntelliSense.ui, 'initContent=', typeof SA.initContent, 'con=', !!SA.con);
  return {};
});
await browser.close();
