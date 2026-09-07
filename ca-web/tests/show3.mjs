import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error' && m.text().includes('ca erp')) console.log(m.text().slice(0, 150)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  const out = {};
  try { globalThis.CA.IntelliSense.show(); out.showCall = 'ok'; } catch (e) { out.showCall = e.message; }
  await new Promise(r2 => setTimeout(r2, 400));
  const sf = globalThis.CA.IntelliSense.show; // 静态 self
  out.prompt = !!sf.prompt;
  out.list = !!sf.list;
  out.listEl = !!(sf.list && sf.list.el);
  out.listChildren = sf.list?.el?.childElementCount ?? -1;
  out.ui = !!globalThis.CA.IntelliSense.ui;
  out.assistCon = !!globalThis.CA.showAssist?.con;
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
