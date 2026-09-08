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
  const chain = [];
  let n = el;
  while (n && chain.length < 12) {
    const cs = getComputedStyle(n);
    const rc = n.getBoundingClientRect();
    chain.push({
      tag: n.tagName + (n.id ? '#' + n.id : ''),
      ta: cs.touchAction, us: cs.userSelect,
      pe: cs.pointerEvents, pos: cs.position, z: cs.zIndex,
      rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
      ownTA: n.style.touchAction || '', ownUS: n.style.userSelect || '', ownPE: n.style.pointerEvents || ''
    });
    n = n.parentElement;
  }
  // 兄弟元素里可能盖在上面的
  const parent = el.parentElement;
  const sibs = parent ? [...parent.children].map(c => {
    const cs = getComputedStyle(c); const rc = c.getBoundingClientRect();
    return { tag: c.tagName, ta: cs.touchAction, us: cs.userSelect, pe: cs.pointerEvents,
      rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)], txt: (c.textContent || '').slice(0, 8) };
  }) : [];
  return { chain, sibs };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
