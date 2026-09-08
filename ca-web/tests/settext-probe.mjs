import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp|ca Error|textwatcher/.test(t)) console.log('[err]', t.slice(0, 180)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

const snap = () => page.evaluate(() => {
  const IS = globalThis.CA.IntelliSense;
  const rows = [];
  if (IS.ui && IS.ui.el) for (const c of IS.ui.el.children) {
    rows.push({ idx: c.getAttribute('data-idx'), txt: (c.textContent || '').trim().replace(/\n/g, '\\n').slice(0, 40) });
  }
  return { value: globalThis.CA.cmd.el.value, cmdname: IS.cmdname, mode: IS.mode,
    inputLen: IS.input ? IS.input.length : -1,
    prompt0: IS.prompt && IS.prompt[0] ? String(IS.prompt[0]).replace(/\n/g, '\\n').slice(0, 40) : '',
    rows };
});

// 1) 真键盘输入未知命令 → 错误态
await page.evaluate(() => { const el = globalThis.CA.cmd.el; const rc = el.getBoundingClientRect(); return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 }; })
  .then(p => page.mouse.click(p.x, p.y));
await page.keyboard.type('/aaaaaa', { delay: 25 });
await new Promise(r => setTimeout(r, 900));
console.log('--- 1) 手输 /aaaaaa ---');
console.log(JSON.stringify(await snap(), null, 1));

// 2) 模拟点击补全选项：引擎走 CA.cmd.setText() 编程式替换文本
await page.evaluate(() => {
  const cmd = globalThis.CA.cmd;
  cmd.setText('/say 大家好');
  cmd.setSelection && cmd.setSelection(20, 20);
});
await new Promise(r => setTimeout(r, 900));
console.log('--- 2) setText("/say 大家好") 后（补全点击等价） ---');
console.log(JSON.stringify(await snap(), null, 1));

// 3) 再 setText 一个应出现参数候选的命令
await page.evaluate(() => {
  const cmd = globalThis.CA.cmd;
  cmd.setText('/give @p');
  cmd.setSelection && cmd.setSelection(20, 20);
});
await new Promise(r => setTimeout(r, 900));
console.log('--- 3) setText("/give @p") 后 ---');
console.log(JSON.stringify(await snap(), null, 1));
await browser.close();
