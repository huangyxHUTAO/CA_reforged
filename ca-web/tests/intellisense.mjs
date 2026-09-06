import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => {
  if (m.type() === 'error') errors.push('[console.error] ' + m.text().slice(0, 200));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 5500));
// 设一下设置
const setup = await page.evaluate(() => {
  globalThis.CA.settings = globalThis.CA.settings || {};
  globalThis.CA.settings.iiMode = 3;
  return {
    settingsSet: globalThis.CA.settings.iiMode,
    hasIntelliSense: !!globalThis.CA.IntelliSense,
    hasProc: typeof globalThis.CA.IntelliSense?.proc,
    hasShow: typeof globalThis.CA.IntelliSense?.show,
    hasUI: !!globalThis.CA.IntelliSense?.ui,
    hasLibrary: !!globalThis.CA.Library,
    hasCommands: !!(globalThis.CA.Library && globalThis.CA.Library.inner && globalThis.CA.Library.inner.default && globalThis.CA.Library.inner.default.commands)
  };
});
console.log('SETUP:', JSON.stringify(setup, null, 2));
// 调 IntelliSense.proc
const r = await page.evaluate(() => {
  try {
    globalThis.CA.IntelliSense.proc('/summon ', 8);
    return {
      inputCount: globalThis.CA.IntelliSense.input?.length || 0,
      outputKeys: globalThis.CA.IntelliSense.output ? Object.keys(globalThis.CA.IntelliSense.output) : null,
      cmdname: globalThis.CA.IntelliSense.cmdname,
      hasSlash: globalThis.CA.IntelliSense.hasSlash,
      patternCount: globalThis.CA.IntelliSense.patterns?.length
    };
  } catch (e) { return { err: e.message }; }
});
console.log('PROC:', JSON.stringify(r, null, 2));
console.log('ERRORS:', errors.length);
errors.slice(0, 5).forEach(e => console.log(' -', e));
await browser.close();
