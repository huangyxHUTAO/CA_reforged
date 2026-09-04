import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
const requests = [];
page.on('response', r => requests.push({ url: r.url(), status: r.status() }));
page.on('pageerror', e => console.log('[PAGEERROR]', e.message.split('\n')[0]));
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  const intl = requests.filter(r => r.url.includes('Intl'));
  console.log('Intl responses:', JSON.stringify(intl, null, 2));
  // 看 Intl.js 第一个响应（应该有 transform header）
  if (intl.length) {
    const sample = await page.evaluate(async (url) => {
      const r = await fetch(url);
      const t = await r.text();
      return { firstLine: t.split('\n')[0], hasMapScript: t.includes('MapScript') };
    }, intl[0].url);
    console.log('Sample:', sample);
  }
} catch (e) { console.log('GOTO ERROR:', e.message); }
await browser.close();
