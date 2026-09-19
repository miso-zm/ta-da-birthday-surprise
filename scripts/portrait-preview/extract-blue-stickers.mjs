// Extract the three separated birthday sticker groups from the approved transparent atlas.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node extract-blue-stickers.mjs input.png output-directory");

const metadata = await sharp(input).metadata();
if (metadata.width !== 1254 || metadata.height !== 1254 || !metadata.hasAlpha) {
  throw new Error("Coordinates require the approved transparent 1254px blue sticker atlas.");
}

const pieces = [
  ["gift", { left: 120, top: 180, width: 535, height: 560 }],
  ["sparkles", { left: 730, top: 225, width: 405, height: 400 }],
  ["confetti", { left: 510, top: 690, width: 620, height: 485 }],
];

function removeTinyAlphaComponents(data, width, height, minimumSize = 600) {
  const count = width * height;
  const seen = new Uint8Array(count);
  const queue = new Int32Array(count);
  for (let start = 0; start < count; start++) {
    if (seen[start] || data[start * 4 + 3] === 0) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      const add = (next) => {
        if (!seen[next] && data[next * 4 + 3] > 0) {
          seen[next] = 1;
          queue[tail++] = next;
        }
      };
      if (x > 0) add(index - 1);
      if (x < width - 1) add(index + 1);
      if (y > 0) add(index - width);
      if (y < height - 1) add(index + width);
    }
    if (tail < minimumSize) {
      for (let index = 0; index < tail; index++) data[queue[index] * 4 + 3] = 0;
    }
  }
}

await mkdir(output, { recursive: true });
for (const [name, bounds] of pieces) {
  const target = path.join(output, `${name}-v1.png`);
  const { data, info } = await sharp(input).extract(bounds).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < info.width * info.height; i++) {
    const alphaIndex = i * 4 + 3;
    const alpha = data[alphaIndex];
    if (alpha <= 8) data[alphaIndex] = 0;
    else if (alpha >= 96) data[alphaIndex] = 255;
    else {
      const normalized = (alpha - 8) / 88;
      const eased = normalized * normalized * (3 - 2 * normalized);
      data[alphaIndex] = Math.round(eased * 255);
    }
  }
  removeTinyAlphaComponents(data, info.width, info.height);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ background: "#00000000", threshold: 1 })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: "#00000000" })
    .png()
    .toFile(target);
  const result = await sharp(target).metadata();
  const stats = await sharp(target).stats();
  console.log(JSON.stringify({
    target,
    width: result.width,
    height: result.height,
    alpha: result.hasAlpha,
    min: stats.channels[3].min,
    max: stats.channels[3].max,
  }));
}
