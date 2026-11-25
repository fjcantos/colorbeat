// Genera los iconos PNG de ColorBeat (4 pads de colores) sin dependencias.
// Uso: node tools/make-icons.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function makeIcon(size) {
  const bg = [18, 18, 24];
  const colors = [[255, 59, 78], [255, 204, 46], [46, 219, 122], [46, 139, 255]];
  const margin = size * 0.16, gap = size * 0.06, cell = (size - margin * 2 - gap) / 2, radius = cell * 0.22;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let c = bg;
      for (let i = 0; i < 4; i++) {
        const x0 = margin + (i % 2) * (cell + gap), y0 = margin + Math.floor(i / 2) * (cell + gap);
        const dx = Math.max(x0 + radius - x, 0, x - (x0 + cell - radius));
        const dy = Math.max(y0 + radius - y, 0, y - (y0 + cell - radius));
        if (x >= x0 && x < x0 + cell && y >= y0 && y < y0 + cell && dx * dx + dy * dy <= radius * radius) c = colors[i];
      }
      raw.set(c, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bits, RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, "..", "icons");
fs.mkdirSync(dir, { recursive: true });
for (const s of [192, 512]) fs.writeFileSync(path.join(dir, `icon-${s}.png`), makeIcon(s));
console.log("Iconos creados en", dir);
