import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(() => {
  const w = globalThis.CA.cmd._textWatchers[0];
  const TW = globalThis.android.text.TextWatcher;
  const probe = new TW({ afterTextChanged: function () { return 42; } });
  return {
    wCtor: w?.constructor?.name,
    wIsFn: typeof w === 'function',
    wKeys: w ? Object.keys(w) : null,
    afterSrc: w?.afterTextChanged ? String(w.afterTextChanged).slice(0, 120) : 'none',
    probeRet: probe.afterTextChanged ? probe.afterTextChanged() : 'no-after',
    probeKeys: Object.keys(probe)
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
