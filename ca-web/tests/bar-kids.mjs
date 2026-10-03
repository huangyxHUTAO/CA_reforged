import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox'], protocolTimeout: 30000
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

const out = await page.evaluate(() => {
  const SG = globalThis.CA.showGen;
  const bar = SG.bar;
  const res = { barKids: [] };
  if (bar) {
    for (const c of bar.children) {
      const rc = c.el.getBoundingClientRect();
      const cs = getComputedStyle(c.el);
      res.barKids.push({
        tag: c.tagNameForView,
        rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
        lp: [c.layoutParams.width, c.layoutParams.height, c.layoutParams.weight],
        padding: cs.padding, text: (c.el.textContent || '').trim().slice(0, 6)
      });
    }
    res.barOrient = bar.orientation;
    res.barAlignItems = getComputedStyle(bar.el).alignItems;
    // textarea 的 UA 默认尺寸
    const ta = globalThis.CA.cmd.el;
    res.textarea = { rows: ta.rows, height: getComputedStyle(ta).height, boxSizing: getComputedStyle(ta).boxSizing };
  }
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();