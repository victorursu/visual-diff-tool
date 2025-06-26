import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import fs from 'fs-extra';
import { PNG } from 'pngjs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });


const CONFIG_PATH = './config.json';
const URL_LIST_PATH = './urls.txt';

const VIEWPORTS = {
  desktop: { width: 1280, height: 800, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true },
};

function sanitizeFilename(input) {
  return input.replace(/[\/\\?%*:|"<>]/g, '_').replace(/^_+/, '');
}

async function uploadToS3(localPath, s3Path, s3Config) {
  const s3 = new S3Client({
    region: s3Config.region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  const fileContent = await fs.readFile(localPath);

  const command = new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: s3Path,
    Body: fileContent,
    ContentType: 'image/png'
  });

  await s3.send(command);
  console.log(`☁️  Uploaded to S3: ${s3Path}`);
}

async function captureScreenshot(url, outPath, viewport, maxHeight, delayMs = 0) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const finalViewport = {
    ...viewport,
    height: maxHeight || viewport.height,
  };


  await page.setViewport(finalViewport);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  await page.screenshot({ path: outPath, fullPage: !maxHeight });
  await browser.close();
}

async function compareImages(beforePath, afterPath, diffPath, config) {
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
  const maxHeight = config.maxHeight ? parseInt(config.maxHeight, 10) : undefined;
  const delayMs = (config.delaySeconds || 0) * 1000;

  const urlPaths = (await fs.readFile(URL_LIST_PATH, 'utf-8'))
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const timestamp = Date.now();
  const now = new Date();
  const formattedDate = now.toISOString()
    .replace(/T/, '-')
    .replace(/:/g, '-')
    .replace(/\..+/, '');

  const outputDir = `./public/results/${formattedDate}-${timestamp}`;
  await fs.ensureDir(outputDir);

  const summaryData = [];

  for (const urlPath of urlPaths) {
    const baseName = urlPath === '/' ? 'home' : sanitizeFilename(urlPath);

    for (const [type, viewport] of Object.entries(VIEWPORTS)) {
      const beforePath = path.join(outputDir, `${baseName}-${type}-before.png`);
      const afterPath = path.join(outputDir, `${baseName}-${type}-after.png`);
      const diffPath = path.join(outputDir, `${baseName}-${type}-diff.png`);

      const sourceUrl = config.sourceBase + urlPath;
      const destUrl = config.destBase + urlPath;

      console.log(`\n🔄 Comparing [${type}]: ${urlPath}`);
      console.log(` → Source: ${sourceUrl}`);
      console.log(` → Dest:   ${destUrl}`);
      if (maxHeight) console.log(` 📏 Max Height: ${maxHeight}px`);

      try {
        await captureScreenshot(sourceUrl, beforePath, viewport, maxHeight, delayMs);
        await captureScreenshot(destUrl, afterPath, viewport, maxHeight, delayMs);

        const diff = await compareImages(beforePath, afterPath, diffPath);
        console.log(` ✅ [${type}] Diff pixels: ${diff}`);

        if (config.s3?.enabled) {
          const baseKey = `${formattedDate}-${timestamp}/${baseName}-${type}`;
          await uploadToS3(beforePath, `${baseKey}-before.png`, config.s3);
          await uploadToS3(afterPath, `${baseKey}-after.png`, config.s3);
          await uploadToS3(diffPath, `${baseKey}-diff.png`, config.s3);
        }

        summaryData.push({
          url: urlPath,
          view: type,
          baseName,
          diffPixels: diff,
          before: beforePath.replace('./public/', ''),
          after: afterPath.replace('./public/', ''),
          diffImage: diffPath.replace('./public/', '')
        });

      } catch (e) {
        console.error(` ❌ Failed [${type}] for ${urlPath}: ${e.message}`);
        summaryData.push({
          url: urlPath,
          view: type,
          baseName,
          diffPixels: '',
          before: '',
          after: '',
          diffImage: '',
          error: e.message
        });
      }
    }
  }

  // Write summary.csv
  const csvPath = path.join(outputDir, 'summary.csv');
  const csvHeader = ['url', 'view', 'baseName', 'diffPixels', 'before', 'after', 'diffImage', 'error'];
  const csvRows = [csvHeader.join(',')];

  for (const entry of summaryData) {
    const row = [
      JSON.stringify(entry.url || ''),
      JSON.stringify(entry.view || ''),
      JSON.stringify(entry.baseName || ''),
      entry.diffPixels ?? '',
      JSON.stringify(entry.before || ''),
      JSON.stringify(entry.after || ''),
      JSON.stringify(entry.diffImage || ''),
      JSON.stringify(entry.error || '')
    ];
    csvRows.push(row.join(','));
  }

  await fs.writeFile(csvPath, csvRows.join('\n'), 'utf8');
  console.log(`📄 CSV summary written to: ${csvPath}`);

  const configWithTimestamp = {
    ...config,
    timestamp: new Date().toISOString()
  };

  const configCopyPath = path.join(outputDir, 'config.json');
  await fs.writeJson(configCopyPath, configWithTimestamp, { spaces: 2 });
  console.log(`🧾 Config with timestamp saved to: ${configCopyPath}`);

  console.log(`\n📁 All results saved in: ${outputDir}`);

  if (process.env.NEXT_PUBLIC_S3_ENABLED && process.env.NEXT_PUBLIC_REMOVE_FOLDER_AFTER_SYNC) {
    try {
      await fs.remove(outputDir);
      console.log(`🗑️ Removed local folder: ${outputDir}`);
    } catch (err) {
      console.error(`⚠️ Failed to remove folder: ${outputDir}`, err.message);
    }
  }

})();
