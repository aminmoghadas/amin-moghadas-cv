const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 900, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const url = 'file://' + path.resolve(__dirname, 'resume-en.html');
  await page.goto(url, { waitUntil: 'networkidle' });

  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
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

  // Override: remove min-height/overflow/margins on shell; tighten .resume padding
  // LTR: orange strip on the LEFT — keep ~12mm left padding, trim right to ~6mm
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
      .resume {
        padding: 9mm 7mm 9mm 13mm !important;
      }
    `,
  });

  // Allow reflow
  await page.waitForTimeout(600);

  // Measure: take max of shell rect, shell scrollHeight, and body scrollHeight
  const dims = await page.evaluate(() => {
    const shell = document.querySelector('.resume-shell');
    const rect = shell.getBoundingClientRect();
    const body = document.body;
    return {
      width: Math.ceil(rect.width),
      height: Math.ceil(Math.max(
        rect.height,
        shell.scrollHeight,
        shell.offsetHeight,
        body.scrollHeight - rect.top
      )),
    };
  });

  console.log(`EN  shell: ${dims.width} × ${dims.height} px`);

  const out = path.join(__dirname, 'Amin-Moghadas-CV-EN.pdf');
  await page.pdf({
    path: out,
    width: `${dims.width}px`,
    height: `${dims.height + 2}px`,
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
