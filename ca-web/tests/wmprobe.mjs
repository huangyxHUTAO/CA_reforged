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
  const wm = globalThis.PWM?.wm;
  const out = {
    hasPWM: !!globalThis.PWM,
    hasWm: !!wm,
    addViewSrc: wm ? String(wm.addView).slice(0, 120) : null,
    patched: !!globalThis.PWM?.__caPatchedWM,
    visible: globalThis.PopupPage ? undefined : null
  };
  // 手动调 addView 试
  const fake = { el: document.createElement('div') };
  try { wm && wm.addView(fake, { x: 0, y: 0, width: -1, height: -1 }); out.manualCall = 'ok'; } catch (e) { out.manualCall = e.message; }
  out.overlayAfter = document.getElementById('ca-overlay')?.childElementCount ?? -1;
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
