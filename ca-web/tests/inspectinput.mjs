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
  const IS = globalThis.CA.IntelliSense;
  globalThis.CA.settings.iiMode = 3;
  // 试不同命令
  const tests = ['/summon ', '/give ', '/effect ', '/'];
  const results = {};
  for (const cmd of tests) {
    try {
      IS.proc(cmd, cmd.length);
      results[cmd] = {
        cmdname: IS.cmdname,
        inputCount: IS.input?.length || 0,
        first3: (IS.input || []).slice(0, 3).map(x => ({
          type: typeof x, ctor: x?.constructor?.name,
          keys: x && typeof x === 'object' ? Object.keys(x).slice(0, 8) : null
        })),
        patterns: (IS.patterns || []).length,
        outputKeys: IS.output ? Object.keys(IS.output) : null
      };
    } catch (e) { results[cmd] = { err: e.message }; }
  }
  return results;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
