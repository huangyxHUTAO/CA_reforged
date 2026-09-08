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
    rows.push({ idx: c.getAttribute('data-idx'), txt: (c.textContent || '').trim().replace(/\n/g, '\\n').slice(0, 44) });
  }
  return { value: globalThis.CA.cmd.el.value, cmdname: IS.cmdname,
    inputLen: IS.input ? IS.input.length : -1,
    prompt0: IS.prompt && IS.prompt[0] ? String(IS.prompt[0]).replace(/\n/g, '\\n').slice(0, 30) : '', rows };
});

// 点击命令栏聚焦
await page.evaluate(() => { const el = globalThis.CA.cmd.el; const rc = el.getBoundingClientRect(); return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 }; })
  .then(p => page.mouse.click(p.x, p.y));
await page.keyboard.type('/give @p', { delay: 25 });
await new Promise(r => setTimeout(r, 900));
console.log('--- A) 手输 /give @p ---');
console.log(JSON.stringify(await snap(), null, 1));

// 点候选行 idx=1 "[...] - 插入参数"（真实点击，应把参数模板插入文本框）
const rows = (await snap()).rows;
const targetRow = rows.find(r => r.txt.includes('插入参数'));
if (targetRow) {
  const pt = await page.evaluate(() => {
    const c = globalThis.CA.IntelliSense.ui.el.children[1];
    const rc = c.getBoundingClientRect();
    return { x: rc.x + 60, y: rc.y + rc.height / 2 };
  });
  await page.mouse.click(pt.x, pt.y);
  await new Promise(r => setTimeout(r, 1000));
  console.log('--- B) 点击 "[...] 插入参数" 候选后 ---');
  console.log(JSON.stringify(await snap(), null, 1));
} else {
  console.log('(no 插入参数 row found)');
  console.log(JSON.stringify(rows, null, 1));
}
await browser.close();
