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
  const FL = globalThis.android.widget.FrameLayout;
  const f = new FL();
  const lp = f.getLayoutParams();
  const out = {
    flIsFn: typeof FL === 'function',
    lpCtor: lp?.constructor?.name,
    lpSetTitle: typeof lp?.setTitle,
    sourceHead: FL.toString().slice(0, 80)
  };
  // 再看 setLayoutParams 兜底
  f.setLayoutParams({ width: -1, height: -2 });
  out.afterSet = typeof f.layoutParams.setTitle;
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
