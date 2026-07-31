import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const SOURCE = path.join(publicDir, 'logo new.png');

const sourceBase64 = fs.readFileSync(SOURCE).toString('base64');
const dataUri = `data:image/png;base64,${sourceBase64}`;

function svgWrap(width, height, href) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <image href="${href}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />
</svg>`;
}

// 1200x630 Open Graph / Twitter social share card (branded with the site logo)
const ogSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f3d24" />
      <stop offset="100%" stop-color="#28592B" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Site logo on the left -->
  <image href="${dataUri}" x="110" y="115" width="400" height="400" preserveAspectRatio="xMidYMid meet" />

  <!-- Brand text on the right -->
  <text x="590" y="270" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="800" fill="#ffffff">1stCars</text>
  <text x="592" y="340" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="600" fill="#91A95D">Premium Used Car Marketplace</text>
  <text x="592" y="410" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="400" fill="#d7e3c8">150-Point Inspection • Single Owned • Non-Accident</text>
  <text x="592" y="452" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="400" fill="#d7e3c8">1stMark Certified Trusted Guarantee</text>
</svg>`;

async function generateIcons() {
  // Save SVG wrappers (embed the PNG so scaling works everywhere)
  const svgContent = svgWrap(500, 500, dataUri);
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  console.log('Saved logo.svg and favicon.svg');

  // Generate PNG files
  const pngSizes = [
    ['logo.png', 512],
    ['1stcars-logo.png', 512],
    ['pwa-512.png', 512],
    ['pwa-192.png', 192],
    ['apple-touch-icon.png', 180],
    ['favicon-32x32.png', 32],
    ['favicon-16x16.png', 16],
  ];

  for (const [file, size] of pngSizes) {
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, file));
    console.log(`Saved ${file} (${size}x${size})`);
  }

  // 1200x630 Open Graph / Twitter social share image (JPEG for broad compatibility)
  await sharp(Buffer.from(ogSvgContent))
    .resize(1200, 630)
    .jpeg({ quality: 85 })
    .toFile(path.join(publicDir, 'og-image.jpg'));
  console.log('Generated og-image.jpg (1200x630)');

  console.log('Successfully generated all logo PNGs, the OG image, and SVG files!');
}

generateIcons().catch(console.error);
