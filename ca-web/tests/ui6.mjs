import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 9000));
const r = await page.evaluate(() => {
  // PWM 是全局；找 defaultWindow
  const PWM = globalThis.PWM;
  const out = { pwmKeys: PWM ? Object.keys(PWM).slice(0, 20) : null };
  const dw = PWM && PWM.defaultWindow;
  if (dw) {
    out.dwType = typeof dw;
    out.dwCtor = dw.constructor?.name;
    out.dwHasEl = !!dw.el;
    const lp = dw.getLayoutParams ? dw.getLayoutParams() : 'NO_GETLAYOUTPARAMS';
    out.lpType = typeof lp;
    out.lpHasSetTitle = lp && typeof lp.setTitle;
    out.lpKeys = lp ? Object.keys(lp).slice(0, 10) : null;
  } else {
    out.dw = 'undefined';
  }
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
