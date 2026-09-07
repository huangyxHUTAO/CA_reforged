import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { if (m.text().includes('[ca-web] CA layout')) console.log(m.text()); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const r = await page.evaluate(() => {
  const mv = globalThis.CA?.gen?.mainView;
  const out = {};
  if (!mv) return { err: 'no main' };
  out.mainH = mv.el.style.height;
  out.mainDisplay = getComputedStyle(mv.el).display;
  out.mainFlexDir = getComputedStyle(mv.el).flexDirection;
  // main 父
  let p = mv.el.parentElement;
  const chain = [];
  while (p) { const cs = getComputedStyle(p); chain.push({ tag: p.tagName, title: p.title, hStyle: p.style.height, h: p.getBoundingClientRect().height|0, flexDir: cs.flexDirection, display: cs.display }); p = p.parentElement; }
  out.chain = chain.slice(0, 6);
  // main 子 con 是否 flex
  const kids = [...mv.el.children];
  out.kids = kids.map(c => { const cs = getComputedStyle(c); return { text: c.textContent.trim().slice(0, 10), flex: cs.flex, h: c.getBoundingClientRect().height|0, hStyle: c.style.height }; });
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
