#!/usr/bin/env node
// Renders the home-screen / PWA icons and the favicon from one SVG: an amber coupe on the
// smoked-oak background. Outputs are committed; re-run (`npm run gen:pwa-icons`) only if the
// art changes. The glass sits inside the middle 80%, so the same art works as a maskable icon.

import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const BG = "#130e0a";
const AMBER = "#edb161";

const glass = `
  <path d="M152 204 H360 C350 252 308 276 256 276 C204 276 162 252 152 204 Z" fill="${AMBER}" opacity=".32"/>
  <g fill="none" stroke="${AMBER}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
    <path d="M136 180 H376 C376 250 324 292 256 292 C188 292 136 250 136 180 Z"/>
    <path d="M256 292 V388"/>
    <path d="M196 392 H316"/>
  </g>`;

const svg = (radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>Home Bar</title>` +
  `<rect width="512" height="512" rx="${radius}" fill="${BG}"/>${glass}</svg>`;

mkdirSync("public/icons", { recursive: true });

// Square: iOS and Android apply their own corner masks.
const square = Buffer.from(svg(0));
const outputs = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/maskable-512.png", 512],
  ["public/icons/apple-touch-icon-180.png", 180],
];
for (const [path, size] of outputs) {
  await sharp(square).resize(size, size).png().toFile(path);
  console.log(`gen-pwa-icons: ${path}`);
}

// The browser tab shows the favicon as-is, so round it.
writeFileSync("public/favicon.svg", `${svg(112)}\n`);
console.log("gen-pwa-icons: public/favicon.svg");
