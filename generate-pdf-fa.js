const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 900, height: 1400 },
    deviceScaleFactor: 2,
    locale: 'fa-IR',
  });
  const page = await context.newPage();

  const url = 'file://' + path.resolve(__dirname, 'resume-fa.html');
  await page.goto(url, { waitUntil: 'networkidle' });

  // YekanBakh is local and variable; wait specifically for it
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    // Try to ensure YekanBakh is loaded
    try {
      await document.fonts.load('400 12px "YekanBakh"');
      await document.fonts.load('700 12px "YekanBakh"');
      await document.fonts.load('800 33px "YekanBakh"');
    } catch (e) {}
  });

  await page.evaluate(async () => {
    const imgs = [...document.images];
    await Promise.all(imgs.map(img =>
      img.decode().catch(() => new Promise(res => {
        if (img.complete) res();
        else { img.onload = img.onerror = res; }
      }))
    ));
  });

  // Override: remove min-height/overflow on shell; tighten .resume padding
  // RTL: orange strip on the RIGHT — keep ~13mm right, trim left to ~7mm
  await page.addStyleTag({
    content: `
      .screen-toolbar { display: none !important; }
      html, body {
        background: #fff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .resume-shell {
        min-height: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        overflow: visible !important;
      }
      body[dir="rtl"] .resume {
        padding: 9mm 13mm 9mm 7mm !important;
      }
    `,
  });

  // Persian font + RTL layout often needs extra reflow time
  await page.waitForTimeout(1200);

  const dims = await page.evaluate(() => {
    const shell = document.querySelector('.resume-shell');
    const rect = shell.getBoundingClientRect();
    const body = document.body;
    // Walk every child of .resume to find absolute bottom
    const resume = document.querySelector('.resume');
    let maxBottom = 0;
    if (resume) {
      const walk = (el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom > maxBottom) maxBottom = r.bottom;
        for (const c of el.children) walk(c);
      };
      walk(resume);
    }
    const shellTop = rect.top;
    const heightFromContent = maxBottom - shellTop;
    return {
      width: Math.ceil(rect.width),
      height: Math.ceil(Math.max(
        rect.height,
        shell.scrollHeight,
        shell.offsetHeight,
        body.scrollHeight - rect.top,
        heightFromContent
      )) + 8, // safety buffer for FA descenders/diacritics
    };
  });

  console.log(`FA  shell: ${dims.width} × ${dims.height} px`);

  const out = path.join(__dirname, 'Amin-Moghadas-CV-FA.pdf');
  await page.pdf({
    path: out,
    width: `${dims.width}px`,
    height: `${dims.height}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: false,
    pageRanges: '1',
  });

  console.log(`✓ ${out}`);
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
