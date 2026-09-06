import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
const logs = [];
page.on('pageerror', e => logs.push('[ERR] ' + e.message.split('\n')[0]));
page.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning' || m.text().includes('[ca')) {
    logs.push(`[${m.type()}] ${m.text().slice(0, 200)}`);
  }
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const r = await page.evaluate(() => {
  try {
    globalThis.CA.showGen(true);
    return { ok: true };
  } catch (e) { return { err: e.message, stack: (e.stack || '').split('\n').slice(0, 3) }; }
});
console.log('RESULT:', JSON.stringify(r, null, 2));
await new Promise(r => setTimeout(r, 1000));
const ca = await page.evaluate(() => {
  const a = document.querySelector('ca-app');
  return { html: a?.shadowRoot?.innerHTML?.slice(0, 200) || '(no shadow)' };
});
console.log('CA-APP shadow:', ca.html);
console.log('LOGS:');
logs.forEach(l => console.log(' ', l));
await browser.close();
