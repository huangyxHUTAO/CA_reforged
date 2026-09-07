import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  // show 是 static self，list/prompt 都是闭包字段（self.list = new G.ListView 同步赋值给 self）
  // 看 show 函数自身的 self
  const showFn = globalThis.CA.IntelliSense.show;
  // show 函数对象的 .prototype 上有什么？
  const ownKeys = Object.getOwnPropertyNames(showFn);
  // self = showFn 的 this
  let listCreated = false;
  // 包装 show 强制重建：把 ui 设为 null
  globalThis.CA.IntelliSense.ui = null;
  // show 内部 first check：if (CA.IntelliSense.ui) return —— ui 已 null，继续
  globalThis.CA.IntelliSense.show();
  await new Promise(r2 => setTimeout(r2, 2000));
  return {
    ui: globalThis.CA.IntelliSense.ui?.constructor?.name,
    list: !!globalThis.CA.IntelliSense.list,
    listChildren: globalThis.CA.IntelliSense.list?.el?.childElementCount
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
