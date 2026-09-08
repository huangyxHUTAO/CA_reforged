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
  const ov = document.getElementById('ca-overlay');
  r.overlay = { pe: getComputedStyle(ov).pointerEvents, kids: ov.childElementCount };
  // 各按钮的 cursor
  const check = (txt) => {
    const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === txt && x.getBoundingClientRect().width > 0);
    if (!s) return null;
    const cs = getComputedStyle(s);
    return { cursor: cs.cursor, pe: cs.pointerEvents, ownPe: s.style.pointerEvents || '(inherit)' };
  };
  r.ca = check('CA'); r.add = check('╋'); r.close = check('关闭');
  // 父链 pe
  const sp = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA');
  if (sp) {
    const chain = []; let n = sp;
    while (n) { chain.push(n.tagName + '.pe=' + (getComputedStyle(n).pointerEvents) + (n.id ? '#' + n.id : '')); n = n.parentElement; }
    r.caChain = chain;
  }
  return r;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
