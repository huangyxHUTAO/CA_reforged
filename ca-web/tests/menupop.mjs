import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error') errs.push(t.slice(0, 200)); });
page.on('pageerror', e => errs.push('PAGEERR: ' + String(e).slice(0, 200)));
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

const snap = () => page.evaluate(() => {
  const o = {};
  const PWM = globalThis.CA.PWM;
  try { o.pwm = PWM.debug ? PWM.debug() : ('keys:' + Object.keys(PWM).slice(0, 20)); } catch (e) { o.pwmErr = String(e); }
  o.fixed = [...document.querySelectorAll('body > div')].filter(d => getComputedStyle(d).position === 'fixed').map(d => ({ id: d.id, kids: d.childElementCount, z: getComputedStyle(d).zIndex, pe: getComputedStyle(d).pointerEvents }));
  o.overlayKids = document.getElementById('ca-overlay') ? document.getElementById('ca-overlay').childElementCount : -1;
  // PopupPage 或 PWM root el 的结构
  o.bodyText = document.body.innerText.replace(/\s+/g, ' ').slice(-90);
  return o;
});

console.log('--- before ---');
console.log(JSON.stringify(await snap(), null, 1));
const mid = await page.evaluate(() => {
  const SG = globalThis.CA.showGen;
  const beforeErr = window.__errCount;
  try {
    SG.menu._listeners.click.onClick(SG.menu);
    return { invoked: true };
  } catch (e) { return { invoked: false, err: String(e) }; }
});
console.log('--- after invoke ---', JSON.stringify(mid));
await new Promise(r => setTimeout(r, 900));
console.log('--- after 900ms ---');
console.log(JSON.stringify(await snap(), null, 1));
console.log('errs:', JSON.stringify(errs.slice(0, 12), null, 1));
await browser.close();
