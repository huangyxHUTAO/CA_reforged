import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const r = await page.evaluate(async () => {
  const cmd = globalThis.CA?.cmd;
  const out = { hasCmd: !!cmd };
  if (!cmd?.el) return out;
  const el = cmd.el;
  const rc = el.getBoundingClientRect();
  out.textarea = { x: rc.x, y: rc.y, w: rc.width, h: rc.height, inDoc: !!el.isConnected, disabled: el.disabled, ro: el.readOnly, pe: getComputedStyle(el).pointerEvents, display: getComputedStyle(el).display };
  // 点击 textarea 中心，看命中谁
  const cx = Math.round(rc.x + rc.width/2), cy = Math.round(rc.y + rc.height/2);
  const hit = document.elementFromPoint(cx, cy);
  out.hitAtCenter = hit ? { tag: hit.tagName, cls: hit.className, isTextarea: hit === el } : null;
  // 查找覆盖在 textarea 上方的顶层元素
  const over = [];
  document.querySelectorAll('*').forEach(e => {
    if (e === el) return;
    const e_ = e.getBoundingClientRect();
    if (e_.width <= 0 || e_.height <= 0) return;
    const cs = getComputedStyle(e);
    if (cs.pointerEvents === 'none') return;
    // 中心点在 textarea 内且 z 更高？
    if (cx >= e_.left && cx <= e_.right && cy >= e_.top && cy <= e_.bottom) {
      const h = document.elementFromPoint(cx, cy);
      over.push({ tag: e.tagName, title: e.title, pe: cs.pointerEvents, isTop: h === e });
    }
  });
  out.coverers = over.slice(0, 10);
  return out;
});
console.log(JSON.stringify(r, null, 2));
// 真实键入测试
await page.evaluate(() => globalThis.CA?.cmd?.el?.focus());
await page.keyboard.type('/summon ', { delay: 30 });
await new Promise(r2 => setTimeout(r2, 1500));
const val = await page.evaluate(() => globalThis.CA?.cmd?.el?.value);
console.log('AFTER TYPE:', JSON.stringify(val));
await page.screenshot({ path: 'tests/type-probe.png' });
await browser.close();
