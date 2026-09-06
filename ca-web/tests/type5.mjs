import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  const out = { tuType: typeof globalThis.CA.showGen.textUpdate };
  try {
    const CS = (await import('/src/sandbox/android-view.js')).CharSequenceWrap;
    const s = new CS('/summon ');
    globalThis.CA.showGen.textUpdate(s, 8);
    await new Promise(r2 => setTimeout(r2, 400));
    out.isInput = globalThis.CA.IntelliSense.input?.length ?? -1;
    out.cmdname = globalThis.CA.IntelliSense.cmdname;
  } catch (e) { out.err = e.message + ' @' + (e.stack || '').split('\n')[1]; }
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
