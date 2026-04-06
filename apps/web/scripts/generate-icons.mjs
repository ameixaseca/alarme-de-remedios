/**
 * Generates public/icon-192.png and public/icon-512.png
 * Pure Node.js — no external dependencies.
 *
 * Icon design: indigo (#4F46E5) background with a white horizontal capsule (pill).
 * Run: node scripts/generate-icons.mjs
 */
import { writeFileSync } from "fs";
import { deflateSync } from "zlib";

// ── CRC32 ────────────────────────────────────────────────
const crc32Table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = crc32Table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ── PNG helpers ──────────────────────────────────────────
function u32be(n) {
  return Buffer.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  return Buffer.concat([u32be(data.length), t, data, u32be(crc32(Buffer.concat([t, data])))]);
}

// ── Icon rasteriser ──────────────────────────────────────
function generateIcon(size) {
  // Background: indigo #4F46E5
  const BG = [79, 70, 229, 255];
  // Pill: white
  const PILL = [255, 255, 255, 255];

  const cx = size / 2;
  const cy = size / 2;
  // Capsule: 60 % wide, 24 % tall
  const halfW = size * 0.30; // half of total width
  const halfH = size * 0.12; // half of total height (= radius of end caps)
  const capOffset = halfW - halfH; // x distance from centre to cap centre

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const inBody = Math.abs(dy) <= halfH && Math.abs(dx) <= capOffset;
      const inLeftCap = Math.hypot(dx + capOffset, dy) <= halfH;
      const inRightCap = Math.hypot(dx - capOffset, dy) <= halfH;
      const [r, g, b, a] = inBody || inLeftCap || inRightCap ? PILL : BG;
      const off = 1 + x * 4;
      row[off] = r; row[off + 1] = g; row[off + 2] = b; row[off + 3] = a;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // bit depth 8, color type RGBA

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/icon-192.png", generateIcon(192));
console.log("✓ public/icon-192.png");

writeFileSync("public/icon-512.png", generateIcon(512));
console.log("✓ public/icon-512.png");
