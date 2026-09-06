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
  const out = {};
  try {
    globalThis.CA.settings.iiMode = 3;
    globalThis.CA.showGen(true);
    out.showGen = 'ok';
  } catch (e) { out.showGen = e.message; }
  // 从 mainView 向上找根，直接挂 overlay
  try {
    const mv = globalThis.CA.gen?.mainView;
    out.hasMainView = !!mv;
    let root = mv, hops = 0;
    while (root && root.getParent && root.getParent() && hops < 20) { root = root.getParent(); hops++; }
    out.hops = hops;
    out.rootCtor = root?.constructor?.name;
    if (root && root.el && !root.el.isConnected) {
      root.el.style.position = 'fixed';
      root.el.style.inset = '0';
      root.el.style.pointerEvents = 'auto';
      document.getElementById('ca-overlay').appendChild(root.el);
      out.attached = true;
    } else {
      out.attached = root?.el ? 'already-connected' : 'no-el';
    }
  } catch (e) { out.attachErr = e.message; }
  out.caViews = document.querySelectorAll('.ca-view').length;
  out.bodyText = document.body.innerText.slice(0, 150);
  return out;
});
console.log(JSON.stringify(r, null, 2));
await new Promise(r2 => setTimeout(r2, 800));
await page.screenshot({ path: 'tests/shot-attached.png' });
await browser.close();
