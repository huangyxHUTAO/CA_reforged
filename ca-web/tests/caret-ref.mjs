import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const out = await page.evaluate(() => {
  const r = {};
  // 对照 textarea：原生、无引擎 listener
  const ref = document.createElement('textarea');
  ref.value = '/say 一二三四五六七八九十一二三四五六七八九十abcdefghij';
  ref.style.cssText = 'position:fixed;left:66px;top:638px;width:781px;height:62px;font-size:16px;z-index:200000;';
  document.body.appendChild(ref);
  const cmd = globalThis.CA.cmd.el;
  const rcRef = ref.getBoundingClientRect();
  const rcCmd = cmd.getBoundingClientRect();
  r.refRect = [Math.round(rcRef.x), Math.round(rcRef.y), Math.round(rcRef.width), Math.round(rcRef.height)];
  r.cmdRect = [Math.round(rcCmd.x), Math.round(rcCmd.y), Math.round(rcCmd.width), Math.round(rcCmd.height)];
  // 事件状态
  window.__st = {};
  const rec = (name, t) => { if (!window.__st[name]) window.__st[name] = []; window.__st[name].push(t); };
  for (const ev of ['pointerdown', 'mousedown']) {
    ref.addEventListener(ev, (e) => rec(ev, e.defaultPrevented));
  }
  return { r };
}).then(d => d.r);
console.log(JSON.stringify(out, null, 1));
// 点击对照 textarea 中间
await page.mouse.click(out.refRect[0] + out.refRect[2] / 2, out.refRect[1] + out.refRect[3] / 2);
await new Promise(r => setTimeout(r, 500));
const res = await page.evaluate(() => {
  const refs = [...document.querySelectorAll('textarea')];
  const ref = refs.find(t => t.style.zIndex === '200000');
  const cmd = globalThis.CA.cmd.el;
  return {
    refSel: ref ? ref.selectionStart + '/' + ref.selectionEnd : 'missing',
    cmdSel: cmd.selectionStart + '/' + cmd.selectionEnd,
    st: window.__st
  };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
