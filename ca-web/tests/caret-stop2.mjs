import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

async function trial(label, where) {
  const p = await browser.newPage();
  await p.setViewport({ width: 900, height: 700 });
  await p.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 11000));
  await p.evaluate((w) => {
    const el = globalThis.CA.cmd.el;
    const node = w === 'el' ? el : w === 'parent' ? el.parentElement : document.querySelector(w);
    if (node) {
      node.addEventListener('pointerdown', (e) => { e.stopImmediatePropagation(); }, true);
    }
  }, where);
  const info = await p.evaluate(() => {
    const el = globalThis.CA.cmd.el;
    el.focus();
    el.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
    el.setSelectionRange(0, 0);
    const rc = el.getBoundingClientRect();
    return { x0: rc.x, y0: rc.y, w: rc.width, h: rc.height };
  });
  await p.mouse.click(info.x0 + info.w * 0.5, info.y0 + info.h / 2);
  await new Promise(r => setTimeout(r, 400));
  const s = await p.evaluate(() => { const el = globalThis.CA.cmd.el; return el.selectionStart + '/' + el.selectionEnd; });
  console.log(label, '->', s);
  await p.close();
}
await trial('stop@el      ', 'el');
await trial('stop@parent  ', 'parent');
await browser.close();
