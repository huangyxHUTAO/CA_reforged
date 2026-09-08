import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const r = await page.evaluate(async () => {
  const out = {};
  for (const t of ['/aaaaaa', '/aaaaaa ', '/aaaaaa xyz']) {
    const cmd = globalThis.CA.cmd;
    cmd.el.value = t;
    cmd.el.setSelectionRange(t.length, t.length);
    cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 300));
    const IS = globalThis.CA.IntelliSense;
    const promptTxt = IS.prompt && IS.prompt[0] ? String(IS.prompt[0]) : '';
    out[t] = {
      cmdname: IS.cmdname, in: (IS.input||[]).length,
      first: (IS.input||[]).slice(0,2).map(x => x&&x.text!==undefined?String(x.text).slice(0,30):'?'),
      prompt: promptTxt.slice(0, 60), help: IS.help ? String(IS.help).slice(0,60) : null
    };
  }
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
