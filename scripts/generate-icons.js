import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Construct high quality SVG matching the uploaded 1stCars tire emblem logo
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g fill="none" fill-rule="evenodd">
    <!-- Speed lines on right side (Dark Forest Green) -->
    <path fill="#28592B" d="M 270 98 L 472 98 C 484 98 492 106 492 118 L 492 122 C 492 134 484 142 472 142 L 350 142 L 305 174 L 270 174 Z" />
    <path fill="#28592B" d="M 330 174 L 428 174 C 438 174 446 182 446 192 L 446 196 C 446 206 438 214 428 214 L 350 214 Z" />
    
    <path fill="#28592B" d="M 270 414 L 472 414 C 484 414 492 406 492 394 L 492 390 C 492 378 484 370 472 370 L 350 370 L 305 338 L 270 338 Z" />
    <path fill="#28592B" d="M 330 338 L 428 338 C 438 338 446 330 446 320 L 446 316 C 446 306 438 298 428 298 L 350 298 Z" />

    <!-- Outer green tire border -->
    <circle cx="200" cy="256" r="172" fill="#28592B" />

    <!-- Light Olive Green tread band -->
    <circle cx="200" cy="256" r="162" fill="#91A95D" />

    <!-- Tread notches pattern -->
    <g stroke="#28592B" stroke-width="6" stroke-linecap="round">
      <path d="M 200 96 Q 225 102 238 116" />
      <path d="M 242 106 Q 262 118 270 134" />
      <path d="M 276 122 Q 292 138 296 158" />
      <path d="M 304 146 Q 316 166 314 188" />
      <path d="M 324 176 Q 332 198 326 220" />
      <path d="M 332 208 Q 336 230 326 252" />
      <path d="M 330 242 Q 330 264 318 284" />
      <path d="M 320 272 Q 316 294 298 312" />
      <path d="M 300 300 Q 290 320 270 336" />
      <path d="M 274 324 Q 260 342 238 352" />
      <path d="M 242 344 Q 224 358 200 362" />
      <path d="M 208 358 Q 186 366 164 362" />
      <path d="M 170 360 Q 148 362 128 350" />
      <path d="M 134 352 Q 112 346 96 328" />
      <path d="M 104 334 Q 86 318 74 298" />
      <path d="M 82 304 Q 68 284 64 262" />
      <path d="M 68 270 Q 58 248 64 224" />
      <path d="M 62 232 Q 62 210 74 190" />
      <path d="M 68 196 Q 74 174 90 156" />
      <path d="M 80 162 Q 92 142 112 128" />
      <path d="M 102 134 Q 118 118 140 108" />
      <path d="M 128 112 Q 150 98 174 92" />
      <path d="M 160 94 Q 182 88 204 88" />
    </g>

    <!-- Inner green hub boundary ring -->
    <circle cx="200" cy="256" r="120" fill="#28592B" />

    <!-- Concentric inner detail rings -->
    <circle cx="200" cy="256" r="114" stroke="#234E25" stroke-width="2" fill="none" />
    <circle cx="200" cy="256" r="108" stroke="#316733" stroke-width="3" fill="none" />
    <circle cx="200" cy="256" r="100" stroke="#234E25" stroke-width="2" fill="none" />

    <!-- Center Hub Fill (Dark Forest Green) -->
    <circle cx="200" cy="256" r="94" fill="#245226" />

    <!-- Center Light Olive Green Number "1" -->
    <path fill="#91A95D" d="M 182 178 
             C 172 188 158 198 144 204
             L 144 224
             C 158 218 172 210 182 200
             L 182 318
             C 182 324 186 328 192 328
             L 208 328
             C 214 328 218 324 218 318
             L 218 178
             C 218 172 214 168 208 168
             L 192 168
             C 186 168 182 172 182 178
             Z" />
  </g>
</svg>`;

// 1200x630 Open Graph / Twitter social share card (branded)
const ogSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f3d24" />
      <stop offset="100%" stop-color="#28592B" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Tire emblem on the left -->
  <g transform="translate(300 315) scale(1.05)">
    <circle cx="0" cy="0" r="172" fill="#28592B" />
    <circle cx="0" cy="0" r="162" fill="#91A95D" />
    <circle cx="0" cy="0" r="120" fill="#28592B" />
    <circle cx="0" cy="0" r="108" stroke="#316733" stroke-width="3" fill="none" />
    <circle cx="0" cy="0" r="94" fill="#245226" />
    <path fill="#91A95D" d="M -18 -78
             C -28 -68 -42 -58 -56 -52
             L -56 -32
             C -42 -38 -28 -46 -18 -56
             L -18 62
             C -18 68 -14 72 -8 72
             L 8 72
             C 14 72 18 68 18 62
             L 18 -78
             C 18 -84 14 -88 8 -88
             L -8 -88
             C -14 -88 -18 -84 -18 -78
             Z" />
  </g>

  <!-- Brand text on the right -->
  <text x="560" y="270" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="800" fill="#ffffff">1stCars</text>
  <text x="562" y="340" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="600" fill="#91A95D">Premium Used Car Marketplace</text>
  <text x="562" y="410" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="400" fill="#d7e3c8">150-Point Inspection • Single Owned • Non-Accident</text>
  <text x="562" y="452" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="400" fill="#d7e3c8">1stMark Certified Trusted Guarantee</text>
</svg>`;

async function generateIcons() {

  const publicDir = path.join(process.cwd(), 'public');

  // Save SVG
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  console.log('Saved logo.svg and favicon.svg');

  // Generate PNG files
  const svgBuffer = Buffer.from(svgContent);

  // Main logo.png and 1stcars-logo.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'logo.png'));

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, '1stcars-logo.png'));

  // 192x192 PWA Icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192.png'));

  // 512x512 PWA Icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512.png'));

  // Apple Touch Icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Standard Favicon 32x32 PNG
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  // Standard Favicon 16x16 PNG
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));

  // 1200x630 Open Graph / Twitter social share image (JPEG for broad compatibility)
  const ogBuffer = Buffer.from(ogSvgContent);
  await sharp(ogBuffer)
    .resize(1200, 630)
    .jpeg({ quality: 85 })
    .toFile(path.join(publicDir, 'og-image.jpg'));
  console.log('Generated og-image.jpg (1200x630)');

  console.log('Successfully generated all logo PNGs, the OG image, and SVG files!');
}


generateIcons().catch(console.error);

