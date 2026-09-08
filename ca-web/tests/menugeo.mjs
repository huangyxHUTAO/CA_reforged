import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const pos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
await page.mouse.click(pos.x, pos.y);
await new Promise(r => setTimeout(r, 800));
const geo = await page.evaluate(() => {
  const out = { items: [] };
  // 找包含"退出命令助手"文本的节点，向上到可视容器，报几何
  const walk = (el, path) => {
    if (!el || el.nodeType !== 1) return;
    const t = (el.textContent || '');
    if (t.includes('退出命令助手') && t.length < 300) {
      const cs = getComputedStyle(el);
      const rc = el.getBoundingClientRect();
      out.items.push({ path: path.slice(-160), tag: el.tagName,
        rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
        disp: cs.display, vis: cs.visibility, opacity: cs.opacity, pos: cs.position, z: cs.zIndex,
        clip: cs.clipPath, overflow: cs.overflow, transform: cs.transform,
        pe: cs.pointerEvents, text: t.replace(/\s+/g, ' ').slice(0, 80) });
    }
    for (const c of el.children) walk(c, path + '/' + c.tagName);
  };
  walk(document.body, 'BODY');
  // body 里所有 fixed/absolute 容器
  out.containers = [...document.querySelectorAll('body div, body span')]
    .filter(d => {
      const cs = getComputedStyle(d); const rc = d.getBoundingClientRect();
      return (cs.position === 'fixed' || cs.position === 'absolute') && cs.display !== 'none' && rc.width > 0;
    })
    .map(d => { const cs = getComputedStyle(d); const rc = d.getBoundingClientRect();
      return { tag: d.tagName, id: d.id || '', pos: cs.position,
        rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)],
        z: cs.zIndex, disp: cs.display, txt: (d.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24) }; })
    .slice(0, 20);
  return out;
});
console.log(JSON.stringify(geo, null, 1));
await page.screenshot({ path: 'tests/menu-geo.png' });
await browser.close();
