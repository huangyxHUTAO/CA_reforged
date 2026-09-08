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
  const out = [];
  const PP = globalThis.PopupPage;
  const seen = new Set();
  const walk = (v, d, note) => {
    if (!v || seen.has(v) || d > 20) return;
    seen.add(v);
    let rec = { d, note: note || '', tag: v.tagNameForView || (v.constructor && v.constructor.name) };
    if (v.el) {
      const rc = v.el.getBoundingClientRect();
      const cs = getComputedStyle(v.el);
      const lp = v.layoutParams || {};
      rec.lp = [lp.width, lp.height];
      rec.gravity = lp.gravity;
      rec.rect = [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)];
      rec.disp = cs.display; rec.pos = cs.position; rec.oh = cs.overflow; rec.op = cs.opacity;
      rec.connected = v.el.isConnected;
      rec.vis = cs.visibility;
      if (v.visibility !== undefined) rec.vFlag = v.visibility;
      rec.pad = cs.padding;
    } else {
      rec.noEl = true;
    }
    out.push(rec);
    if (v.children) v.children.forEach(c => walk(c, d + 1, ''));
  };
  for (const e of PP.defaultStack) {
    out.push({ page: e.name, modal: e.modal });
    walk(e.page.mainView, 0, 'mainView');
  }
  return out;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
