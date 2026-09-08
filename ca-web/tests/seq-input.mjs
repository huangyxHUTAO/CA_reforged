import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp|ca Error|Uncaught|textwatcher/.test(t)) console.log('[err]', t.slice(0, 200)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

async function clickCmd() {
  const info = await page.evaluate(() => {
    const el = globalThis.CA.cmd.el;
    const rc = el.getBoundingClientRect();
    return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
  });
  await page.mouse.click(info.x, info.y);
  await new Promise(r => setTimeout(r, 500));
}

async function snapshot(tag) {
  const s = await page.evaluate(() => {
    const IS = globalThis.CA.IntelliSense;
    const list = IS.ui;
    const listEl = list && list.el;
    const rows = [];
    if (listEl) {
      for (const child of listEl.children) {
        rows.push({
          idx: child.getAttribute('data-idx'),
          txt: (child.textContent || '').trim().replace(/\n/g, '\\n').slice(0, 60)
        });
      }
    }
    return {
      value: globalThis.CA.cmd.el.value,
      cmdname: IS.cmdname, mode: IS.mode, hasSlash: IS.hasSlash,
      inputLen: IS.input ? IS.input.length : -1,
      promptLen: IS.prompt ? IS.prompt.length : -1,
      prompt0: IS.prompt && IS.prompt[0] ? String(IS.prompt[0]).replace(/\n/g, '\\n').slice(0, 50) : '',
      adapterCount: list && list.adapter && typeof list.adapter.getCount === 'function' ? list.adapter.getCount() : null,
      headerCount: list && list.getHeaderViewsCount ? list.getHeaderViewsCount() : null,
      rows
    };
  });
  console.log('--- ' + tag + ' ---');
  console.log(JSON.stringify(s, null, 1));
}

// 清空输入框（退格）
async function clearInput() {
  await page.evaluate(() => {
    const el = globalThis.CA.cmd.el;
    el.focus();
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 400));
  // 全选 + 删除（真键盘 Ctrl+A Backspace）
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await new Promise(r => setTimeout(r, 400));
}

await clickCmd();
await snapshot('初始');

// 输入未知命令
await page.keyboard.type('/aaaaaa', { delay: 30 });
await new Promise(r => setTimeout(r, 900));
await snapshot('输入 /aaaaaa');

// 输入已知命令前缀
await clearInput();
await page.keyboard.type('/say ', { delay: 30 });
await new Promise(r => setTimeout(r, 900));
await snapshot('输入 /say ');

// 再输一个带参数的选择器命令验证还能再解析
await clearInput();
await page.keyboard.type('/give @p diamond 1', { delay: 30 });
await new Promise(r => setTimeout(r, 900));
await snapshot('输入 /give @p diamond 1');

await browser.close();
