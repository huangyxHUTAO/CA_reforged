import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
await page.evaluate(() => {
  const c = globalThis.CA.cmd; c.el.value='/aaaaaa'; c.el.dispatchEvent(new Event('input',{bubbles:true}));
});
await new Promise(r => setTimeout(r, 1000));
const r = await page.evaluate(() => {
  // CA.con 与 showAssist 结构
  const con = globalThis.CA.con; // CA.con FrameLayout 内容容器
  const SA = globalThis.CA.showAssist;
  const info = (v, label) => {
    if (!v || !v.el) return { label, missing: true };
    const cs = getComputedStyle(v.el); const rc = v.el.getBoundingClientRect();
    return { label, tag: v.tagNameForView, display: cs.display, vis: cs.visibility, pos: cs.position,
      rect: [rc.x|0, rc.y|0, rc.width|0, rc.height|0], trans: cs.transform, kids: v.el.childElementCount };
  };
  return {
    con: info(con, 'CA.con'),
    conKids: con?.el ? [...con.el.children].map((c,i)=>{ const cs=getComputedStyle(c); const rc=c.getBoundingClientRect(); return {i, tag:c.tagName, disp:cs.display, pos:cs.position, rect:[rc.x|0,rc.y|0,rc.width|0,rc.height|0], trans:cs.transform, text:c.textContent.trim().slice(0,16)}; }) : null,
    assistLinear: info(SA?.linear, 'assist.linear'),
    assistCon: info(SA?.con, 'assist.con'),
    assistHelp: info(SA?.help, 'assist.help'),
    history: (() => { const H=globalThis.CA.history; return H? info(H,'history') : null; })()
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
