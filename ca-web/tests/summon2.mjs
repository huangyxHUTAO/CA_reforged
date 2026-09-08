import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp|ca Error|textwatcher/.test(t)) console.log('[err]', t.slice(0, 200)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

const snap = (tag) => page.evaluate((t) => {
  const IS = globalThis.CA.IntelliSense;
  const rows = [];
  if (IS.ui && IS.ui.el) for (const c of IS.ui.el.children) {
    rows.push({ idx: c.getAttribute('data-idx'), txt: (c.textContent || '').trim().replace(/\n/g, '\\n').slice(0, 44) });
  }
  return { tag: t, value: globalThis.CA.cmd.el.value, cmdname: IS.cmdname, mode: IS.mode,
    inputLen: IS.input ? IS.input.length : -1,
    inputHead: IS.input ? IS.input.slice(0, 2).map(x => String(x && x.text !== undefined ? x.text : x).slice(0, 18)) : [],
    prompt0: IS.prompt && IS.prompt[0] ? String(IS.prompt[0]).replace(/\n/g, '\\n').slice(0, 44) : '', rows };
}, tag);

const clickCmd = async () => {
  const p = await page.evaluate(() => { const el = globalThis.CA.cmd.el; const rc = el.getBoundingClientRect(); return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 }; });
  await page.mouse.click(p.x, p.y);
  await new Promise(r => setTimeout(r, 400));
};
await clickCmd();
await page.keyboard.type('/summon ', { delay: 20 });
await new Promise(r => setTimeout(r, 800));

// 点击 allay 行 (idx1)
const rc1 = await page.evaluate(() => {
  const list = globalThis.CA.IntelliSense.ui.el;
  const row = list.querySelector('[data-idx="1"]');
  const r = row.getBoundingClientRect();
  return { x: r.x + 80, y: r.y + r.height / 2 };
});
await page.mouse.click(rc1.x, rc1.y);
await new Promise(r => setTimeout(r, 900));
console.log(JSON.stringify(await snap('A) 点击 allay 后'), null, 1));

// 再输空格，看位置参数补全
await page.keyboard.type(' ', { delay: 20 });
await new Promise(r => setTimeout(r, 800));
console.log(JSON.stringify(await snap('B) /summon allay 后加空格'), null, 1));

// 手输数字坐标
await page.keyboard.type('0 0 0', { delay: 20 });
await new Promise(r => setTimeout(r, 800));
console.log(JSON.stringify(await snap('C) /summon allay 0 0 0'), null, 1));
await browser.close();
