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
  // 找 PWM 实例的 defaultWindow
  const FL = globalThis.android.widget.FrameLayout;
  const probe = new FL();
  const lp = probe.getLayoutParams();
  return {
    flType: typeof FL,
    lpType: typeof lp,
    lpHasSetTitle: typeof lp.setTitle,
    lpProto: Object.getPrototypeOf(lp)?.constructor?.name
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
