// Atlas-specific extraction for the approved blue collage. The input already has true alpha.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node extract-blue-assets.mjs input.png output-directory");

const metadata = await sharp(input).metadata();
if (metadata.width !== 1254 || metadata.height !== 1254 || !metadata.hasAlpha) {
  throw new Error("Coordinates require the approved transparent 1254px blue atlas.");
}

const pieces = [
  ["background", { left: 20, top: 89, width: 849, height: 970 }],
  ["star", { left: 926, top: 296, width: 262, height: 274 }],
  ["cake", { left: 818, top: 664, width: 430, height: 553 }],
];

function keepLargestAlphaComponent(data, width, height) {
  const count = width * height;
  const seen = new Uint8Array(count);
  const queue = new Int32Array(count);
  let largestStart = -1;
  let largestSize = 0;
  const visit = (start, mark) => {
    let head = 0, tail = 0;
    queue[tail++] = start;
    mark[start] = 1;
    while (head < tail) {
      const index = queue[head++], x = index % width, y = Math.floor(index / width);
      const add = (next) => {
        if (!mark[next] && data[next * 4 + 3] > 0) {
          mark[next] = 1;
          queue[tail++] = next;
        }
      };
      if (x > 0) add(index - 1);
      if (x < width - 1) add(index + 1);
      if (y > 0) add(index - width);
      if (y < height - 1) add(index + width);
    }
    return tail;
  };
  for (let index = 0; index < count; index++) {
    if (seen[index] || data[index * 4 + 3] === 0) continue;
    const size = visit(index, seen);
    if (size > largestSize) {
      largestStart = index;
      largestSize = size;
    }
  }
  const keep = new Uint8Array(count);
  if (largestStart >= 0) visit(largestStart, keep);
  for (let index = 0; index < count; index++) if (!keep[index]) data[index * 4 + 3] = 0;
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
  keepLargestAlphaComponent(data, info.width, info.height);
  const normalized = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  await sharp(normalized)
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
