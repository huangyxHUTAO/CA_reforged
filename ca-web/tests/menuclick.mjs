import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error') errs.push(t.slice(0, 200)); });
page.on('pageerror', e => errs.push('PAGEERR: ' + String(e).slice(0, 200)));
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

// 点 CA 按钮弹菜单
const caPos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
await page.mouse.click(caPos.x, caPos.y);
await new Promise(r => setTimeout(r, 900));

// 找菜单里"设置"项文本的叶子位置并点击
const menuItems = await page.evaluate(() => {
  const ov = document.getElementById('ca-overlay');
  const texts = [...ov.querySelectorAll('span, div')].filter(el => {
    const t = (el.textContent || '').trim();
    const rc = el.getBoundingClientRect();
    return rc.width > 10 && rc.height > 10 && rc.y < 700 && rc.x < 900 &&
      ['设置', '教程', '退出命令助手', '切换全屏/悬浮窗'].some(k => t === k);
  }).map(el => {
    const rc = el.getBoundingClientRect();
    return { txt: (el.textContent || '').trim().slice(0, 16), tag: el.tagName,
      x: Math.round(rc.x), y: Math.round(rc.y), w: Math.round(rc.width), h: Math.round(rc.height),
      cursor: getComputedStyle(el).cursor, pe: getComputedStyle(el).pointerEvents,
      onclick: !!el.onclick };
  });
  return texts.slice(0, 12);
});
console.log('menu items:', JSON.stringify(menuItems, null, 1));

// 点"教程"项（相对无副作用）
const tgt = menuItems.find(m => m.txt === '教程');
if (tgt) {
  const beforeText = await page.evaluate(() => document.body.innerText.length);
  errs.length = 0;
  await page.mouse.click(tgt.x + tgt.w / 2, tgt.y + tgt.h / 2);
  await new Promise(r => setTimeout(r, 800));
  const after = await page.evaluate(() => ({ len: document.body.innerText.length, hasTutorial: document.body.innerText.includes('教程') }));
  console.log('click 教程 ->', JSON.stringify(after), 'changed:', after.len !== beforeText);
  console.log('errs:', JSON.stringify(errs.slice(0, 5), null, 1));
}
await browser.close();
