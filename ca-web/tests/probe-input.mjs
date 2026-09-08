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
  for (const t of ['x', 'a', '/', '/sum', '/summon ', '/give ', '/effect ']) {
    const cmd = globalThis.CA.cmd;
    cmd.el.value = t;
    cmd.el.setSelectionRange(t.length, t.length);
    cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 400));
    const IS = globalThis.CA.IntelliSense;
    out[t] = {
      cmdname: IS.cmdname, inputCount: (IS.input||[]).length,
      first3: (IS.input||[]).slice(0,3).map(x => x && x.text !== undefined ? String(x.text).slice(0,24) : (typeof x === 'string' ? x.slice(0,24) : '?')),
      strParam: String(IS.strParam||'').slice(0,20)
    };
  }
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
