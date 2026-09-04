import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
const requests = [];
page.on('request', r => requests.push(r.url()));
page.on('pageerror', e => console.log('[PAGEERROR]', e.message.split('\n')[0]));
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  const intlReq = requests.filter(u => u.includes('Intl'));
  console.log('Intl requests:', intlReq);
  console.log('Total requests:', requests.length);
} catch (e) { console.log('GOTO ERROR:', e.message); }
await browser.close();
