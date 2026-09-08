import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error') errs.push(t.slice(0, 220)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

const out = await page.evaluate(async () => {
  const r = {};
  const SG = globalThis.CA.showGen;
  r.hasSG = !!SG;
  try {
    r.iiMode = CA.settings.iiMode;
    r.loadingStatus = CA.Library.loadingStatus;
    r.cmdstr = CA.cmdstr;
  } catch (e) { r.settingsErr = String(e); }
  const addSpan = [...document.querySelectorAll('#ca-overlay span')].find(s => s.textContent.trim() === '╋');
  r.addSpanFound = !!addSpan;
  if (addSpan) {
    const orig = addSpan.onclick;
    let fired = 0, origThrew = null, origReturn = 'not-called';
    addSpan.onclick = (e) => {
      fired++;
      try { origReturn = orig ? orig(e) : 'no-orig'; }
      catch (err) { origThrew = String(err); }
    };
    addSpan.click();
    await new Promise(res => setTimeout(res, 300));
    r.addFired = fired;
    r.addOrigReturn = origReturn;
    r.addOrigThrew = origThrew;
    r.cmdValueAfterAdd = CA.cmd ? CA.cmd.el.value : null;
    // restore
    addSpan.onclick = orig;
  }
  return r;
});
console.log(JSON.stringify(out, null, 2));
console.log('errs:', JSON.stringify(errs, null, 1));
await browser.close();
