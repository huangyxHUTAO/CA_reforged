import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { const t=m.text(); if (m.type()==='error' && (t.includes('ca erp')||t.includes('Invalid')||t.includes('createElement'))) console.log('[err]', t.slice(0,200)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
// ╋ span 的 onclick 是否引擎绑了
const btnInfo = await page.evaluate(() => {
  const el = [...document.querySelectorAll('span')].find(e => e.textContent.trim()==='╋');
  return el ? { hasOnClick: typeof el.onclick, hasListener: !!el.__caClick, title: el.title } : null;
});
// 手动弹菜单
const r = await page.evaluate(async () => {
  const out = { before: document.getElementById('ca-overlay').childElementCount };
  try {
    globalThis.Common.showOperateDialog([{ text: '插入……' }, { text: '设置', onclick(){ out.setClicked=true; } }]);
    out.called = true;
  } catch (e) { out.err = e.message; }
  await new Promise(r2 => setTimeout(r2, 1200));
  out.after = document.getElementById('ca-overlay').childElementCount;
  out.newText = [...document.getElementById('ca-overlay').children].map(c => c.innerText?.slice(0,100));
  return out;
});
console.log('btn:', JSON.stringify(btnInfo));
console.log(JSON.stringify(r, null, 2));
await browser.close();
