import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  const out = {};
  out.before = { ui: globalThis.CA.IntelliSense.ui?.constructor?.name, list: !!globalThis.CA.IntelliSense.list };
  // 显式 show
  globalThis.CA.IntelliSense.show();
  await new Promise(r2 => setTimeout(r2, 1500));
  out.after = { ui: globalThis.CA.IntelliSense.ui?.constructor?.name, list: !!globalThis.CA.IntelliSense.list };
  // 触发 input
  globalThis.CA.cmd.el.value = '/summon ';
  globalThis.CA.cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 1500));
  out.after2 = { ui: globalThis.CA.IntelliSense.ui?.constructor?.name, list: !!globalThis.CA.IntelliSense.list };
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
