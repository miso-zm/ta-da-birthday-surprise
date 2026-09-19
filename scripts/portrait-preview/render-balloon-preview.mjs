import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { applyTornBottomMask } from "../../src/lib/portrait/sticker.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const asset = (name) => `${root}public/assets/portrait/balloon/${name}-v1.png`;
const sample = `${root}docs/designs/d062-woman-cutout-v3.png`;
const output = `${root}docs/designs/d062-balloon-complete-v11.png`;
const size = 720;

async function fit(file, width) {
  return sharp(file).resize({ width, withoutEnlargement: false }).png().toBuffer();
}

async function sticker(file, width) {
  const input = await fit(file, width);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const torn = applyTornBottomMask(
    new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    info.width,
    info.height,
    22,
  );
  const alpha = new Uint8Array(info.width * info.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = torn[i * 4 + 3];
  const radius = 7;
  const expanded = new Uint8Array(alpha.length);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    let value = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= info.height) continue;
      const dxLimit = Math.floor(Math.sqrt(radius * radius - dy * dy));
      for (let dx = -dxLimit; dx <= dxLimit; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < info.width) value = Math.max(value, alpha[yy * info.width + xx]);
      }
    }
    expanded[y * info.width + x] = value;
  }
  const outline = Buffer.alloc(info.width * info.height * 4);
  const shadow = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < expanded.length; i++) {
    outline[i * 4] = 255; outline[i * 4 + 1] = 253; outline[i * 4 + 2] = 249; outline[i * 4 + 3] = expanded[i];
    const x = i % info.width, y = Math.floor(i / info.width), shadowY = y + 2;
    if (shadowY < info.height) {
      const j = (shadowY * info.width + x) * 4;
      shadow[j] = 43; shadow[j + 1] = 33; shadow[j + 2] = 22; shadow[j + 3] = Math.round(expanded[i] * 0.1);
    }
  }
  return sharp({ create: { width: info.width, height: info.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: await sharp(shadow, { raw: { width: info.width, height: info.height, channels: 4 } }).blur(2).png().toBuffer() },
      { input: await sharp(outline, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer() },
      { input: await sharp(Buffer.from(torn.buffer, torn.byteOffset, torn.byteLength), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer() },
    ]).png().toBuffer();
}

const [background, person, gift, cake] = await Promise.all([
  fit(asset("background"), 698), sticker(sample, 510), fit(asset("gift-star"), 216), fit(asset("cake"), 252),
]);
const personTop = 122;
const art = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } })
  .composite([
    { input: background, left: 11, top: 5 },
    { input: person, left: 105, top: personTop },
    { input: gift, left: 18, top: 446 },
    { input: cake, left: 450, top: 402 },
  ]).png().toBuffer();

const artData = art.toString("base64");
const page = `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="1688" viewBox="0 0 780 1688">
<defs><pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.2" fill="#e9dfd2" opacity=".35"/></pattern></defs>
<rect width="780" height="1688" fill="#fbf7f1"/><rect width="780" height="1688" fill="url(#dots)"/>
<g font-family="PingFang SC, Hiragino Sans GB, sans-serif" fill="#2e2218">
<text x="56" y="82" font-size="30" font-weight="700">给 Mia 的惊喜</text><text x="724" y="82" text-anchor="end" font-size="26" font-weight="600" fill="#9b8a78">5 / 5</text>
<image href="data:image/png;base64,${artData}" x="70" y="168" width="640" height="640"/>
<text x="390" y="936" text-anchor="middle" font-size="56" font-weight="700">生日快乐，Mia！</text>
<text x="390" y="1012" text-anchor="middle" font-size="30" font-weight="500" fill="#987d68">愿这份心意，</text>
<text x="390" y="1058" text-anchor="middle" font-size="30" font-weight="500" fill="#987d68">陪你开启开心的新一岁。</text>
<rect x="54" y="1138" width="672" height="104" rx="52" fill="#ff8978"/>
<text x="390" y="1204" text-anchor="middle" font-size="32" font-weight="700" fill="#fff">查看礼物</text>
<text x="390" y="1322" text-anchor="middle" font-size="28" font-weight="500" fill="#705c4b" text-decoration="underline">再看一次</text>
</g></svg>`;
await sharp(Buffer.from(page)).png().toFile(output);
await readFile(output);
console.log(output);
