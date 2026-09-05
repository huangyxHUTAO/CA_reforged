import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => {
  if (m.type() === 'error') errors.push(`[console.error] ${m.text().slice(0, 200)}`);
});

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
await new Promise(r => setTimeout(r, 2000));

// 抓整个页面的 DOM + 样式摘要
const desc = await page.evaluate(() => {
  const body = document.body;
  const html = document.documentElement;
  const ca = document.querySelector('ca-app');

  // 抓 body 上每个直接子节点的描述
  function describe(el, depth = 0) {
    if (!el || depth > 4) return null;
    const r = {
      tag: el.tagName,
      id: el.id || undefined,
      cls: el.className || undefined,
      text: el.children.length === 0 ? el.textContent?.slice(0, 60) : undefined
    };
    const cs = getComputedStyle(el);
    r.color = cs.color;
    r.bg = cs.backgroundColor;
    r.font = cs.fontFamily.slice(0, 30);
    r.size = `${el.offsetWidth}x${el.offsetHeight}`;
    if (el.children.length) {
      r.children = [...el.children].slice(0, 5).map(c => describe(c, depth + 1));
    }
    return r;
  }

  // 主题 token
  const root = getComputedStyle(document.documentElement);
  const tokens = {
    bg: root.getPropertyValue('--md-sys-color-background').trim(),
    surface: root.getPropertyValue('--md-sys-color-surface').trim(),
    primary: root.getPropertyValue('--md-sys-color-primary').trim(),
    onBg: root.getPropertyValue('--md-sys-color-on-background').trim()
  };

  return {
    title: document.title,
    bodyDesc: describe(body),
    caAppExists: !!ca,
    caAppHTML: ca?.outerHTML?.slice(0, 200) || '(no ca-app)',
    tokens,
    viewport: { w: window.innerWidth, h: window.innerHeight }
  };
});

console.log('=== PAGE DESCRIPTION ===');
console.log(JSON.stringify(desc, null, 2));
console.log('\n=== ERRORS ===');
errors.forEach(e => console.log('  -', e));

await page.screenshot({ path: 'tests/screenshot-final.png' });
console.log('\nScreenshot at: tests/screenshot-final.png');

await browser.close();
