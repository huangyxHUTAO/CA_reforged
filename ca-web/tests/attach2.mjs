import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 9000));
const r = await page.evaluate(() => {
  globalThis.CA.settings.iiMode = 3;
  globalThis.CA.showGen(true);
  const mv = globalThis.CA.gen?.mainView;
  if (mv && mv.el && !mv.el.isConnected) {
    mv.el.style.cssText += 'position:fixed;inset:0;pointer-events:auto;background:#fff;z-index:100000;';
    document.getElementById('ca-overlay').appendChild(mv.el);
  }
  return {
    overlayChildren: document.getElementById('ca-overlay').childElementCount,
    // mainView.el 里有什么
    mvTag: mv?.el?.tagName,
    mvChildren: mv?.el?.childElementCount,
    mvHTML: mv?.el?.innerHTML?.slice(0, 600),
    mvText: mv?.el?.innerText?.slice(0, 200),
    // CA.cmd 输入框
    cmdTag: globalThis.CA.cmd?.el?.tagName,
    cmdConnected: !!globalThis.CA.cmd?.el?.isConnected
  };
});
console.log(JSON.stringify(r, null, 2));
await new Promise(r2 => setTimeout(r2, 500));
await page.screenshot({ path: 'tests/shot-real.png' });
await browser.close();
