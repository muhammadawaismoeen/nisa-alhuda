/**
 * Generate favicon + app icons from the MoG (Women of Guidance) logo.
 *
 * Sources:
 *   public/logo-mog.svg  — full brand mark (Kufic square + wordmark)
 *
 * Outputs (Next.js App Router convention):
 *   src/app/favicon.ico        — 16/32/48 multi-res .ico
 *   src/app/icon.png           — 512x512 PWA / modern <link rel="icon">
 *   src/app/apple-icon.png     — 180x180 apple-touch-icon
 *   public/logo-mog-square.png — 1024 social preview (optional)
 *
 * The favicon/icon uses ONLY the Kufic square (wordmark dropped — unreadable
 * at small sizes) on the brand pink `#c14974` background.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = path.resolve(__dirname, "..");
const SRC_SVG = path.join(ROOT, "public", "logo-mog.svg");

// Brand pink matching the provided logo mock. Sampled from the hex pink used
// throughout the site (rose primary). Adjust here if the brand shifts.
const BG_HEX = "#c14974";

/**
 * Build a square SVG that contains only the second <g> of the source SVG
 * (the Kufic block — the first <g> is the "Women of Guidance" wordmark,
 * which we drop for small icons). Adds brand-pink background + margin.
 */
function buildSquareKuficSvg(size: number): Buffer {
  const raw = fs.readFileSync(SRC_SVG, "utf8");
  // Grab groups in order.
  const groupRe = /<g\b[^>]*>[\s\S]*?<\/g>/g;
  const groups = raw.match(groupRe) || [];
  if (groups.length < 2) throw new Error("Unexpected SVG structure.");
  const kufic = groups[1]; // second group = square calligraphy
  // Kufic bbox, determined empirically from the path data:
  //   x: 80.14 → 783.86 (w = 703.72)
  //   y: 74.63 → 464.43 (h = 389.80)
  // The mark isn't a perfect square; we letterbox it inside a square canvas
  // with equal padding so it centers nicely on the pink background.
  const markW = 703.72;
  const markH = 389.8;
  const pad = 0.18; // 18% padding all around
  const canvas = Math.max(markW, markH) * (1 + pad * 2);
  const offsetX = (canvas - markW) / 2 - 80.14;
  const offsetY = (canvas - markH) / 2 - 74.63;

  // The source SVG paints via a `.cls-1 { fill:#fff }` rule in its <defs>.
  // We're extracting just the <g> so that stylesheet context is gone — inline
  // a white fill on the wrapper instead.
  const inner = kufic.replace(/^<g[^>]*>/, "").replace(/<\/g>$/, "");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${canvas} ${canvas}">
  <rect width="100%" height="100%" fill="${BG_HEX}"/>
  <g fill="#ffffff" transform="translate(${offsetX}, ${offsetY})">${inner}</g>
</svg>`,
    "utf8"
  );
}

async function renderPng(size: number, outPath: string) {
  const svg = buildSquareKuficSvg(size);
  await sharp(svg).resize(size, size).png().toFile(outPath);
  console.log(`  ✓ ${path.relative(ROOT, outPath)} (${size}x${size})`);
}

async function main() {
  const APP_DIR = path.join(ROOT, "src", "app");
  const PUB_DIR = path.join(ROOT, "public");

  // 1. Modern PNG icons (Next.js App Router convention)
  await renderPng(512, path.join(APP_DIR, "icon.png"));
  await renderPng(180, path.join(APP_DIR, "apple-icon.png"));
  await renderPng(1024, path.join(PUB_DIR, "logo-mog-square.png"));

  // 2. Multi-res .ico for legacy browsers / bookmark bars
  const icoSizes = [16, 32, 48];
  const icoBufs: Buffer[] = [];
  for (const s of icoSizes) {
    icoBufs.push(
      await sharp(buildSquareKuficSvg(s)).resize(s, s).png().toBuffer()
    );
  }
  const ico = await pngToIco(icoBufs);
  const icoPath = path.join(APP_DIR, "favicon.ico");
  fs.writeFileSync(icoPath, ico);
  console.log(
    `  ✓ ${path.relative(ROOT, icoPath)} (multi-res: ${icoSizes.join(", ")})`
  );

  console.log("\nDone. Redeploy to see the new favicon in production.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
