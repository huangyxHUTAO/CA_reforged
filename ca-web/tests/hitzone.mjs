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
  const info = (el, label) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const rc = el.getBoundingClientRect();
    const onTop = document.elementFromPoint(rc.x + Math.min(rc.width / 2, 400), rc.y + Math.min(rc.height / 2, 320));
    return {
      label, tag: el.tagName, id: el.id || '', cls: (el.className || '').toString().slice(0, 40),
      pos: cs.position, z: cs.zIndex, disp: cs.display, vis: cs.visibility, opacity: cs.opacity,
      pe: cs.pointerEvents,
      rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
      hitAtCenter: onTop ? onTop.tagName + '#' + onTop.id + '.' + (onTop.className || '').toString().slice(0, 20) : null,
      bg: cs.backgroundColor,
      text: (el.textContent || '').slice(0, 40).replace(/\s+/g, ' ')
    };
  };
  const res = { bodyChildren: [] };
  for (const c of document.body.children) {
    const cs = getComputedStyle(c); const rc = c.getBoundingClientRect();
    res.bodyChildren.push({
      tag: c.tagName, id: c.id || '', cls: (c.className || '').toString().slice(0, 30),
      rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
      disp: cs.display, pos: cs.position, z: cs.zIndex, pe: cs.pointerEvents
    });
  }
  // CA.con / assist.con / cmd.el 与 body 直系层的关系
  res.con = info(globalThis.CA && CA.con ? CA.con.el : null, 'CA.con');
  res.cmd = info(globalThis.CA && CA.cmd && CA.cmd.el ? CA.cmd.el : null, 'CA.cmd');
  res.assistCon = info(globalThis.CA && CA.showAssist && CA.showAssist.con ? CA.showAssist.con.el : null, 'assist.con');
  // elementFromPoint 测试几个位置
  const pts = [[450, 100], [450, 320], [450, 660], [30, 660], [870, 660]];
  res.hitTests = pts.map(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return { x, y, tag: el ? el.tagName : null, id: el ? el.id : null,
      cls: el ? (el.className || '').toString().slice(0, 25) : null,
      txt: el ? (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 25) : null };
  });
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
