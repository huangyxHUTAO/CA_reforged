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
// 手动把内容容器撑开：找到 900x10 overflow hidden 的那层
const before = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-idx]')].filter(r => r.textContent.includes('插入'));
  if (!rows.length) return { err: 'no rows' };
  // 向上找到 ListView 的父（那个 10px 容器）
  let lv = rows[0];
  while (lv && !(getComputedStyle(lv).overflow === 'auto' && lv.querySelectorAll('[data-idx]').length > 3)) lv = lv.parentElement;
  const container = lv ? lv.parentElement : null;
  const rc = container ? container.getBoundingClientRect() : null;
  if (container) {
    container.style.height = '400px';
    container.style.overflow = 'visible';
  }
  return { containerFound: !!container, containerRectBefore: rc ? [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)] : null };
});
console.log('container:', JSON.stringify(before));
await new Promise(r => setTimeout(r, 300));
// elementFromPoint 测试能否命中菜单行
const after = await page.evaluate(() => {
  const hits = [];
  for (const y of [30, 80, 130, 180, 230, 280, 330]) {
    const el = document.elementFromPoint(450, y);
    hits.push({ y, txt: el ? (el.textContent || '').trim().slice(0, 14) : null,
      idx: el && el.closest ? (el.closest('[data-idx]') ? el.closest('[data-idx]').getAttribute('data-idx') : null) : null });
  }
  return hits;
});
console.log('hits:', JSON.stringify(after, null, 1));
// 尝试点击"设置"
const setRow = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => /设置/.test(r.textContent) && r.textContent.length < 20 && r.getBoundingClientRect().width > 0);
  if (!row) return null;
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 60, y: rc.y + rc.height / 2 };
});
if (setRow) {
  const lenBefore = await page.evaluate(() => document.body.innerText.length);
  await page.mouse.click(setRow.x, setRow.y);
  await new Promise(r => setTimeout(r, 700));
  const lenAfter = await page.evaluate(() => document.body.innerText.length);
  console.log('click 设置 changed:', lenBefore !== lenAfter);
  const tail = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(-90));
  console.log('tail:', tail);
}
await browser.close();
