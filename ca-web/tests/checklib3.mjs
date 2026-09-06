import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 8000));
const r = await page.evaluate(() => {
  const IS = globalThis.CA?.IntelliSense;
  return {
    isObj: typeof IS === 'object',
    isLib: typeof IS?.library,
    libKeys: IS?.library ? Object.keys(IS.library).slice(0, 15) : null,
    commandsCount: IS?.library?.commands ? Object.keys(IS.library.commands).length : 0,
    // proc 内部 this 是 IntelliSense 吗？调 proc 看 this.library
    procResult: (() => {
      try {
        IS.proc('/summon ', 8);
        return { cmdname: IS.cmdname, inputCount: IS.input?.length };
      } catch (e) { return { err: e.message }; }
    })()
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
