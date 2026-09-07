import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error' && m.text().includes('ca erp')) console.log(m.text().slice(0, 250)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
// 静场后手动触发 gostate1 全链
await page.evaluate(async () => {
  const cmd = globalThis.CA.cmd;
  cmd.el.value = '/summon ';
  cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 800));
});
await browser.close();
