import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox'],
  protocolTimeout: 30000
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

// 只读几何，不触发任何交互
const geo = await page.evaluate(() => {
  const cmd = globalThis.CA && globalThis.CA.cmd;
  if (!cmd || !cmd.el) return { err: 'no cmd' };
  const out = {};
  const node = (v, label) => {
    if (!v || !v.el) { out[label] = null; return; }
    const rc = v.el.getBoundingClientRect();
    const cs = getComputedStyle(v.el);
    out[label] = {
      tag: v.tagNameForView,
      rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
      lp: v.layoutParams ? [v.layoutParams.width, v.layoutParams.height, v.layoutParams.weight] : null,
      css: { display: cs.display, height: cs.height, padding: cs.padding, minHeight: cs.minHeight, maxHeight: cs.maxHeight, flex: cs.flex }
    };
  };
  node(cmd, 'cmd');
  node(cmd.getParent(), 'bar');
  node(cmd.getParent() && cmd.getParent().getParent(), 'main');
  return out;
});
console.log(JSON.stringify(geo, null, 1));
await browser.close();