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

// 用 CDP 截图 + 解析像素，判断菜单文字是否真的渲染在屏幕上
const shot = await page.screenshot({ encoding: 'binary' });
// 检查 y 行是否有文字像素差异 —— 简化：截图并评估关键区域的色彩分布
const out = await page.evaluate(() => {
  // 计算菜单第一行 "插入……" 与主界面文字的颜色差异来判断是否渲染
  const findText = (txt) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; const res = [];
    while (n = walker.nextNode()) {
      if (n.textContent.includes(txt)) res.push(n.parentElement);
    }
    return res;
  };
  const menuEls = findText('插入');
  const mainEls = findText('历史');
  const info = (el, label) => {
    if (!el) return null;
    const rc = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()];
    return { label, rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
      color: cs.color, bg: cs.backgroundColor, fontSize: cs.fontSize,
      textRects: rects.slice(0, 3).map(r => [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]) };
  };
  // 菜单文字节点
  const leafText = [...document.querySelectorAll('span,div')].find(el => el.textContent.trim() === '插入……' && el.getBoundingClientRect().width > 0);
  return { menuLeaf: info(leafText, '菜单第一行'), menuLeafParent: info(leafText ? leafText.parentElement : null, '菜单第一行父'),
    isMenuLeafVisible: leafText ? !!(leafText.offsetWidth || leafText.getClientRects().length) : false };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
