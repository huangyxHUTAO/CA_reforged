import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => {
  if (m.text().includes('[ca-web]')) console.log(m.text());
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
// 等更久
await new Promise(r => setTimeout(r, 7000));
const r = await page.evaluate(() => ({
  libCommands: globalThis.CA?.IntelliSense?.library?.commands ? Object.keys(globalThis.CA.IntelliSense.library.commands).length : null,
  libEnums: globalThis.CA?.IntelliSense?.library?.enums ? Object.keys(globalThis.CA.IntelliSense.library.enums).length : null,
  libSelectors: globalThis.CA?.IntelliSense?.library?.selectors ? Object.keys(globalThis.CA.IntelliSense.library.selectors).length : null,
  libIdList: globalThis.CA?.IntelliSense?.library?.idlist?.length || 0
}));
console.log('PATCH RESULT:', JSON.stringify(r, null, 2));
// 试 proc
const proc = await page.evaluate(() => {
  try {
    globalThis.CA.IntelliSense.proc('/summon ', 8);
    return {
      cmdname: globalThis.CA.IntelliSense.cmdname,
      inputCount: globalThis.CA.IntelliSense.input?.length || 0,
      patternCount: globalThis.CA.IntelliSense.patterns?.length || 0,
      firstInput: globalThis.CA.IntelliSense.input?.[0]
    };
  } catch (e) { return { err: e.message }; }
});
console.log('PROC:', JSON.stringify(proc, null, 2));
await browser.close();
