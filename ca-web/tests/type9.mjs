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
  const cmd = globalThis.CA.cmd;
  const before = cmd.__caInputCount || 0;
  cmd.el.value = '/summon ';
  cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 500));
  return {
    before, after: cmd.__caInputCount || 0,
    isInput: globalThis.CA.IntelliSense.input?.length ?? -1,
    cmdname: globalThis.CA.IntelliSense.cmdname
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
