import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp|ca Error/.test(t)) console.log('[err]', t.slice(0, 120)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 15000)); // 等更久

// 检查页面上的所有 span 按钮
const spans = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('#ca-overlay span')].filter(s => s.getBoundingClientRect().width > 0);
  return spans.map(s => ({ 
    text: s.textContent.trim().slice(0, 20), 
    rect: s.getBoundingClientRect(),
    onclick: !!s.onclick
  }));
});
console.log('CA overlay spans:', JSON.stringify(spans, null, 1));

// 也检查 body 整体文本
const bodyText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 200));
console.log('Body text:', bodyText);

await browser.close();