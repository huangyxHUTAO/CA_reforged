import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message.split('\n')[0]));
page.on('console', m => { if (m.type()==='error'&&(m.text().includes('ca erp')||m.text().includes('Invalid')||m.text().includes('createElement'))) console.log('[err]', m.text().slice(0,180)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const before = await page.evaluate(() => document.getElementById('ca-overlay')?.childElementCount);
const pos = await page.evaluate(() => {
  const el = [...document.querySelectorAll('span')].find(e => e.textContent.trim()==='╋' && getComputedStyle(e).display!=='none');
  if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};
});
await page.mouse.click(pos.x, pos.y);
await new Promise(r => setTimeout(r, 1500));
const r = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  const info = [];
  for (const c of ov.children) info.push({ title: c.title, kids: c.childElementCount, text: c.innerText?.slice(0,120) });
  return { count: ov.childElementCount, info, body: document.body.innerText.slice(0,250) };
});
console.log('before children:', before);
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/menu.png' });
await browser.close();
