import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  const cmd = globalThis.CA?.cmd;
  if (!cmd || !cmd.el) return { err: 'no cmd' };
  // 输入 /summon 
  cmd.el.focus();
  cmd.el.value = '/summon ';
  cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  cmd.el.dispatchEvent(new Event('keyup', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 2500));
  // 收集可见文本
  return {
    inputCount: globalThis.CA.IntelliSense.input?.length,
    cmdText: cmd.el.value,
    bodyText: document.body.innerText.slice(0, 400)
  };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/final2.png' });
await browser.close();
