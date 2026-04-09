const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xFFFFFFFF;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xEDB88320 ^ (v >>> 1) : v >>> 1;
    table[n] = v;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function writeU32(buf, offset, val) {
  buf[offset] = (val >>> 24) & 0xFF;
  buf[offset + 1] = (val >>> 16) & 0xFF;
  buf[offset + 2] = (val >>> 8) & 0xFF;
  buf[offset + 3] = val & 0xFF;
}

function makeChunk(type, data) {
  const typeData = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4);
  writeU32(len, 0, data.length);
  const crc = Buffer.alloc(4);
  writeU32(crc, 0, crc32(typeData));
  return Buffer.concat([len, typeData, crc]);
}

function createPNG(size) {
  const r = 37, g = 99, b = 235;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  writeU32(ihdrData, 0, size);
  writeU32(ihdrData, 4, size);
  ihdrData[8] = 8;
  ihdrData[9] = 2;

  const rowBytes = 1 + size * 3;
  const rawRow = Buffer.alloc(rowBytes);
  rawRow[0] = 0;
  for (let x = 0; x < size; x++) {
    rawRow[1 + x * 3] = r;
    rawRow[2 + x * 3] = g;
    rawRow[3 + x * 3] = b;
  }
  const rawData = Buffer.concat(Array(size).fill(rawRow));
  const compressed = zlib.deflateSync(rawData);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync('public/icons/icon-192.png', createPNG(192));
fs.writeFileSync('public/icons/icon-512.png', createPNG(512));
console.log('Icons generated: 192x192 and 512x512');
