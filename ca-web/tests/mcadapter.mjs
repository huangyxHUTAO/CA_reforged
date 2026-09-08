import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const out = await page.evaluate(() => {
  const r = { hasGlobal: 'MCAdapter' in globalThis };
  const M = globalThis.MCAdapter;
  if (M) {
    r.type = typeof M;
    r.keys = Object.keys(M).slice(0, 30);
    r.availableType = typeof M.available;
    r.available = M.available ? String(M.available).slice(0, 120) : null;
    r.getInfoType = typeof M.getInfo;
    r.host = globalThis.MapScript ? MapScript.host : 'no MapScript';
    r.onCreate = typeof M.onCreate;
  } else {
    r.err = 'MCAdapter undefined';
  }
  // MapScript.global 里有没有？
  if (globalThis.MapScript) {
    r.msGlobalHasMC = 'MCAdapter' in (MapScript.global || {});
    r.msGlobal = MapScript.global ? Object.keys(MapScript.global).filter(k => /MC|Adapter/i.test(k)).slice(0, 10) : [];
  }
  return r;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
