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
  const el = globalThis.CA.cmd.el;
  el.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  const r = {};
  // 在 document 捕获阶段记录每个事件 target/是否被 preventDefault
  const log = [];
  const record = (name) => document.addEventListener(name, (e) => {
    const t = e.target;
    log.push({ ev: name, phase: 'doc', tag: t && t.tagName, isCmd: t === el,
      defaultPrevented: e.defaultPrevented, defaultPreventedAfter: e.defaultPrevented });
  }, true);
  ['pointerdown', 'mousedown', 'mouseup', 'click', 'pointerup'].forEach(record);
  // 也检查 el 自身捕获阶段的 preventDefault 情况 —— 用 addEventListener 在 el 上
  const elLog = [];
  ['pointerdown', 'mousedown'].forEach(name => el.addEventListener(name, (e) => {
    elLog.push({ ev: name, on: 'el-capture', defaultPrevented: e.defaultPrevented, handlers: e.eventPhase });
  }, true));
  const rc = el.getBoundingClientRect();
  const midX = rc.x + rc.width / 2, midY = rc.y + rc.height / 2;
  const ev = (type) => new MouseEvent(type, { bubbles: true, cancelable: true, clientX: midX, clientY: midY, view: window });
  // 手动派发序列（不影响真实 default 行为，仅观察监听器）
  for (const t of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
    el.dispatchEvent(ev(t));
  }
  r.log = log;
  r.elLog = elLog;
  r.selAfterDispatch = { s: el.selectionStart, e: el.selectionEnd };
  // el 上的 onpointerdown / onmousedown 等
  r.handlers = {
    onpointerdown: el.onpointerdown ? String(el.onpointerdown).slice(0, 80) : null,
    onmousedown: el.onmousedown ? String(el.onmousedown).slice(0, 80) : null,
    onclick: el.onclick ? String(el.onclick).slice(0, 80) : null,
    onmouseup: el.onmouseup ? String(el.onmouseup).slice(0, 80) : null
  };
  return r;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
