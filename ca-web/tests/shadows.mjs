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
  const caApp = document.querySelector('ca-app');
  r.caAppShadow = caApp ? (caApp.shadowRoot ? 'open:' + caApp.shadowRoot.childElementCount : 'none') : 'missing';
  // CA.cmd.el 的祖先链
  const el = globalThis.CA.cmd.el;
  const chain = [];
  let n = el;
  while (n) { chain.push(n.tagName + (n.id ? '#' + n.id : '') + (n.className ? '.' + String(n.className).slice(0,15) : '')); n = n.parentElement; }
  r.cmdChain = chain;
  // 引擎 DOM 在不在 shadow root 里
  const findInShadow = (root, path) => {
    if (!root) return [];
    const out = [];
    if (root.contains && root.contains(el)) out.push(path + ' CONTAINS cmd');
    for (const c of root.children) out.push(...findInShadow(c, path + '/' + c.tagName));
    return out;
  };
  r.shadowHit = caApp && caApp.shadowRoot ? findInShadow(caApp.shadowRoot, 'ca-app-shadow') : [];
  // body.innerText vs shadow 内的文本分布
  r.bodyText = document.body.innerText.replace(/\s+/g, ' ').slice(0, 80);
  // 从 cmd.el 往上数 5 层找哪个祖先在 body.children 里
  const top = [];
  let m = el, depth = 0;
  while (m && depth < 8) { const p = m.parentElement; if (!p || p === document.body) { top.push({ d: depth, tag: m.tagName, id: m.id, isBodyChild: p === document.body, inCaApp: !!(p && p.closest && p.closest('ca-app')) }); } m = p; depth++; }
  r.attachInfo = top;
  return r;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
