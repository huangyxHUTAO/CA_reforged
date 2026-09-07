import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const r = await page.evaluate(() => {
  const mv = globalThis.CA?.gen?.mainView;
  const bar = globalThis.CA?.showGen?.bar;
  return {
    hasMain: !!mv, mainTag: mv?.tagNameForView,
    mainKids: mv?.el ? [...mv.el.children].map(c => ({
      tag: c.tagName, title: c.title, text: c.textContent.trim().slice(0, 12),
      h: c.getBoundingClientRect().height|0, y: c.getBoundingClientRect().y|0
    })) : null,
    bar: bar ? { tag: bar.tagNameForView, inMainKids: mv?.el ? [...mv.el.children].indexOf(bar.el) : -1 } : null,
    barKids: bar?.el ? [...bar.el.children].map(c => ({ tag: c.tagName, text: c.textContent.trim().slice(0, 12), h: c.getBoundingClientRect().height|0 })) : null
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
