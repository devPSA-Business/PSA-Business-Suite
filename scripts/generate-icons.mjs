// scripts/generate-icons.mjs
// Use: node scripts/generate-icons.mjs
// Requires: npm install sharp --save-dev

import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';

async function generate() {
  const svgPath = './public/icon.svg';
  if (!existsSync(svgPath)) {
    console.error('Error: ./public/icon.svg not found.');
    process.exit(1);
  }

  const svgBuffer = readFileSync(svgPath);
  const outputDir = './public';

  const sizes = [
    { size: 180, name: 'icon-180.png' },  // iOS apple-touch-icon
    { size: 192, name: 'icon-192.png' },  // Android homescreen
    { size: 512, name: 'icon-512.png' },  // Splash screen & maskable
  ];

  console.log('--- Generating PWA Icons ---');
  for (const { size, name } of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size, { 
          fit: 'contain', 
          background: { r: 30, g: 58, b: 138, alpha: 1 } // #1e3a8a = theme_color PSA
        }) 
        .png({ quality: 90 })
        .toFile(path.join(outputDir, name));
      console.log(`✓ Generated ${name}`);
    } catch (err) {
      console.error(`✗ Failed to generate ${name}:`, err);
    }
  }
  console.log('--- Finished ---');
}

generate();
