import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 5500));
const r = await page.evaluate(() => {
  const L = globalThis.CA?.Library;
  return {
    hasInner: !!L?.inner,
    innerKeys: L?.inner ? Object.keys(L.inner) : null,
    defaultHasCommands: !!(L?.inner?.default?.commands),
    defaultCommandsCount: L?.inner?.default?.commands ? Object.keys(L.inner.default.commands).length : null,
    sampleCommands: L?.inner?.default?.commands ? Object.keys(L.inner.default.commands).slice(0, 5) : null,
    isIntelliSenseLibrary: globalThis.CA?.IntelliSense?.library ? Object.keys(globalThis.CA.IntelliSense.library) : null
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
