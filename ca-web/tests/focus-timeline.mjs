import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const info = await page.evaluate(() => {
  const el = globalThis.CA.cmd.el;
  const rc = el.getBoundingClientRect();
  // 挂焦点监视
  window.__flog = [];
  document.addEventListener('focusin', e => window.__flog.push(['in', Date.now()%100000, e.target.tagName]), true);
  document.addEventListener('focusout', e => window.__flog.push(['out', Date.now()%100000, e.target.tagName]), true);
  el.addEventListener('mousedown', () => window.__flog.push(['md', Date.now()%100000, 'ta']));
  el.addEventListener('mouseup', () => window.__flog.push(['mu', Date.now()%100000, 'ta']));
  el.addEventListener('click', () => window.__flog.push(['ck', Date.now()%100000, 'ta']));
  el.addEventListener('focus', () => window.__flog.push(['focus', Date.now()%100000, 'ta']));
  return { x: rc.x+rc.width/2, y: rc.y+rc.height/2 };
});
await page.mouse.click(info.x, info.y);
await new Promise(r => setTimeout(r, 1000));
const r = await page.evaluate(() => ({
  log: window.__flog.slice(-20),
  active: document.activeElement?.tagName + (document.activeElement?.id?'#'+document.activeElement.id:''),
  taConnected: globalThis.CA.cmd.el.isConnected,
  taInBody: document.body.contains(globalThis.CA.cmd.el),
  taRect: (() => { const r = globalThis.CA.cmd.el.getBoundingClientRect(); return {x:r.x|0,y:r.y|0,w:r.width|0,h:r.height|0}; })()
}));
console.log(JSON.stringify(r, null, 2));
await browser.close();
