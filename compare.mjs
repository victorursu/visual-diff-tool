import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import fs from 'fs-extra';
import { PNG } from 'pngjs';
import path from 'path';

const CONFIG_PATH = './config.json';
const URL_LIST_PATH = './urls.txt';

const VIEWPORTS = {
  desktop: { width: 1280, height: 800, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true }, // iPhone 12 Pro-like
};

function sanitizeFilename(input) {
  return input.replace(/[\/\\?%*:|"<>]/g, '_').replace(/^_+/, '');
}

async function captureScreenshot(url, outPath, viewport) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
}

async function compareImages(beforePath, afterPath, diffPath) {
  const img1 = PNG.sync.read(fs.readFileSync(beforePath));
  const img2 = PNG.sync.read(fs.readFileSync(afterPath));

  const width = Math.min(img1.width, img2.width);
  const height = Math.min(img1.height, img2.height);
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    img1.data, img2.data, diff.data, width, height,
    { threshold: 0.1 }
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return numDiffPixels;
}

(async () => {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));
  const urlPaths = (await fs.readFile(URL_LIST_PATH, 'utf-8'))
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const timestamp = Date.now();
  const now = new Date();
  const formattedDate = now.toISOString()
    .replace(/T/, '-')                // "2025-06-17-14:02:00.000Z"
    .replace(/:/g, '-')               // "2025-06-17-14-02-00.000Z"
    .replace(/\..+/, '');             // remove milliseconds and Z

  const outputDir = `./public/results/${formattedDate}-${timestamp}`;

  await fs.ensureDir(outputDir);

  for (const urlPath of urlPaths) {
    const encodedPath = sanitizeFilename(urlPath);

    for (const [type, viewport] of Object.entries(VIEWPORTS)) {
      const beforePath = path.join(outputDir, `${encodedPath}-${type}-before.png`);
      const afterPath = path.join(outputDir, `${encodedPath}-${type}-after.png`);
      const diffPath = path.join(outputDir, `${encodedPath}-${type}-diff.png`);

      const sourceUrl = config.sourceBase + urlPath;
      const destUrl = config.destBase + urlPath;

      console.log(`\n🔄 Comparing [${type}]: ${urlPath}`);
      console.log(` → Source: ${sourceUrl}`);
      console.log(` → Dest:   ${destUrl}`);

      try {
        await captureScreenshot(sourceUrl, beforePath, viewport);
        await captureScreenshot(destUrl, afterPath, viewport);
        const diff = await compareImages(beforePath, afterPath, diffPath);
        console.log(` ✅ [${type}] Diff pixels: ${diff}`);
      } catch (e) {
        console.error(` ❌ Failed [${type}] for ${urlPath}: ${e.message}`);
      }
    }
  }

  console.log(`\n📁 All results saved in: ${outputDir}`);
})();
