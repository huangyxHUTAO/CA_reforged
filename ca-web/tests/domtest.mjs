import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
page.on('console', m => {
  if (m.type() === 'log' || m.type() === 'error') console.log(`[${m.type()}]`, m.text().slice(0, 200));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
// 检查 ca-app 是不是已经升级成 custom element
const info = await page.evaluate(() => {
  const ca = document.querySelector('ca-app');
  return {
    tagName: ca?.tagName,
    isCustom: ca ? !ca.constructor.toString().includes('HTMLUnknownElement') : null,
    ctorName: ca?.constructor?.name,
    hasShadow: !!ca?.shadowRoot,
    customElementsHasCA: !!customElements.get('ca-app')
  };
});
console.log('CA-APP:', JSON.stringify(info, null, 2));
await browser.close();
