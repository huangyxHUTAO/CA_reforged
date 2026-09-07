import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  // 强制 showAssist 走初始化（即使已 init 也再调）
  globalThis.CA.showAssist();
  await new Promise(r2 => setTimeout(r2, 2000));
  // 再触发 input 让 IntelliSense 重画 list
  globalThis.CA.cmd.el.value = '/summon ';
  globalThis.CA.cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 2000));
  const IS = globalThis.CA.IntelliSense;
  const SA = globalThis.CA.showAssist;
  return {
    isList: !!IS.list,
    listKeys: IS.list ? Object.keys(IS.list).slice(0, 5) : null,
    listEl: IS.list ? !!IS.list.el : null,
    inputCount: IS.input?.length,
    conChildren: SA.con?.el?.childElementCount,
    conHasList: SA.con?.el?.children?.[0] === IS.list?.el,
    listParent: IS.list?.el?.parentElement?.tagName
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
