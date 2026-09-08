import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const out = await page.evaluate(() => {
  const r = {};
  const el = globalThis.CA.cmd.el;
  r.cmdTextarea = {
    cursor: getComputedStyle(el).cursor,
    ownCursor: el.style.cursor || '(none)',
    tag: el.tagName
  };
  // 挂 click listener 的按钮（CA 按钮 span）应为 pointer
  const btns = ['CA', '╋', '关闭'];
  r.buttons = {};
  for (const t of btns) {
    const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === t && x.getBoundingClientRect().width > 0);
    if (s) {
      r.buttons[t] = { cursor: getComputedStyle(s).cursor, hasClick: !!s.onclick || !!(s.closest('div') && s.closest('div').onclick) };
    }
  }
  return r;
});
console.log(JSON.stringify(out, null, 1));
// caret 回归：点中间
const info = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  el.focus();
  el.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  el.setSelectionRange(0, 0);
  const rc = el.getBoundingClientRect();
  return { x0: rc.x, y0: rc.y, w: rc.width, h: rc.height };
});
await page.mouse.click(info.x0 + info.w * 0.5, info.y0 + info.h / 2);
await new Promise(r => setTimeout(r, 400));
const s = await page.evaluate(() => { const el = globalThis.CA.cmd.el; return el.selectionStart + '/' + el.selectionEnd; });
console.log('caret middle click:', s);
await browser.close();
