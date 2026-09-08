import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const caPos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
await page.mouse.click(caPos.x, caPos.y);
await new Promise(r => setTimeout(r, 900));
const out = await page.evaluate(() => {
  const r = {};
  const lv = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).overflow === 'auto' && d.querySelectorAll('[data-idx]').length > 3);
  if (!lv) return { err: 'no listview' };
  const contentC = lv.parentElement; // 900x10 内容容器 (FrameLayout wrap)
  const mainFrame = contentC.parentElement; // 900x700 FrameLayout mainView?
  r.structure = {
    lvRect: (() => { const x = lv.getBoundingClientRect(); return [x.x, x.y, x.width, x.height]; })(),
    cRect: (() => { const x = contentC.getBoundingClientRect(); return [x.x, x.y, x.width, x.height]; })(),
    mRect: mainFrame ? (() => { const x = mainFrame.getBoundingClientRect(); return [x.x, x.y, x.width, x.height]; })() : null
  };
  // 方法 A：让 contentC 成为 grid，ListView 占满（模拟 Android FrameLayout 叠放，不再裁内容）
  contentC.style.display = 'grid';
  contentC.style.gridTemplateColumns = '1fr';
  contentC.style.gridTemplateRows = '1fr';
  contentC.style.overflow = 'visible';
  lv.style.gridRow = '1'; lv.style.gridColumn = '1';
  lv.style.position = 'static';
  return r;
});
console.log('structure:', JSON.stringify(out));
await new Promise(r => setTimeout(r, 400));
const after = await page.evaluate(() => {
  const lv = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).overflow === 'auto' && d.querySelectorAll('[data-idx]').length > 3);
  const c = lv ? lv.parentElement : null;
  const cRc = c ? c.getBoundingClientRect() : null;
  const lvRc = lv ? lv.getBoundingClientRect() : null;
  return { cRect: cRc ? [Math.round(cRc.x), Math.round(cRc.y), Math.round(cRc.width), Math.round(cRc.height)] : null,
    lvRect: lvRc ? [Math.round(lvRc.x), Math.round(lvRc.y), Math.round(lvRc.width), Math.round(lvRc.height)] : null };
});
console.log('after grid:', JSON.stringify(after));
// 试点设置
const pt = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '设置' && r.getBoundingClientRect().width > 0);
  if (!row) return null;
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 100, y: rc.y + rc.height / 2 };
});
console.log('设置行:', JSON.stringify(pt));
if (pt) {
  await page.mouse.click(pt.x, pt.y);
  await new Promise(r => setTimeout(r, 700));
  const tail = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(-80));
  console.log('tail:', tail);
}
await browser.close();
