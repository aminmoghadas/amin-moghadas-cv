const { chromium } = require('playwright');
const path = require('path');

async function generatePDF(htmlFile, outputFile) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 900, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const url = 'file://' + path.resolve(htmlFile);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Ensure fonts are fully loaded
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });

  // Wait for all images
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise(res => { img.onload = img.onerror = res; })
      )
    );
  });

  // Hide screen-only chrome and let shell grow to its natural height
  await page.addStyleTag({
    content: `
      .screen-toolbar { display: none !important; }
      html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
      .resume-shell {
        min-height: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
    `,
  });

  // Settle
  await page.waitForTimeout(400);

  // Measure shell dimensions
  const dims = await page.evaluate(() => {
    const shell = document.querySelector('.resume-shell');
    const rect = shell.getBoundingClientRect();
    return {
      width: Math.ceil(rect.width),
      height: Math.ceil(Math.max(shell.scrollHeight, rect.height)),
    };
  });

  console.log(`  shell: ${dims.width}px × ${dims.height}px`);

  // Single-page PDF with exact content dimensions
  await page.pdf({
    path: outputFile,
    width: `${dims.width}px`,
    height: `${dims.height}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: false,
    pageRanges: '1',
  });

  await browser.close();
}

(async () => {
  const targets = [
    { html: 'resume-en.html', pdf: 'Amin-Moghadas-CV-EN.pdf' },
    { html: 'resume-fa.html', pdf: 'Amin-Moghadas-CV-FA.pdf' },
  ];

  for (const t of targets) {
    console.log(`→ ${t.html}`);
    await generatePDF(
      path.join(__dirname, t.html),
      path.join(__dirname, t.pdf)
    );
    console.log(`  ✓ ${t.pdf}`);
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
