import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const caPos = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#ca-overlay span')].find(x => x.textContent.trim() === 'CA' && x.getBoundingClientRect().width > 0);
  const rc = s.getBoundingClientRect();
  return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
});
await page.mouse.click(caPos.x, caPos.y);
await new Promise(r => setTimeout(r, 900));
const pt = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-idx]')].find(r => r.textContent.trim() === '设置' && r.getBoundingClientRect().width > 0);
  const rc = row.getBoundingClientRect();
  return { x: rc.x + 100, y: rc.y + rc.height / 2 };
});
await page.mouse.click(pt.x, pt.y);
await new Promise(r => setTimeout(r, 900));
const out = await page.evaluate(() => {
  const text = document.body.innerText.replace(/\s+/g, ' ');
  // 设置页行：外观/智能补全/用户数据/关于命令助手
  const rows = ['外观', '智能补全', '用户数据', '关于命令助手'].map(t => {
    const el = [...document.querySelectorAll('span,div')].find(e => e.textContent.trim() === t && e.getBoundingClientRect().width > 0);
    if (!el) return { t, found: false };
    const rc = el.getBoundingClientRect();
    const top = document.elementFromPoint(rc.x + rc.width / 2, rc.y + rc.height / 2);
    return { t, found: true, rect: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)], hitSelf: el === top || el.contains(top) };
  });
  return { text: text.slice(0, 160), rows };
});
console.log(JSON.stringify(out, null, 1));
await page.screenshot({ path: 'tests/settings-page.png' });
await browser.close();
