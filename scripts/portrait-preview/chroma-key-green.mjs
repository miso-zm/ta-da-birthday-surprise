// Deterministic local cleanup for imagegen references made on #00ff00.
import sharp from "sharp";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node chroma-key-green.mjs input.png output.png");
const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < info.width * info.height; i++) {
  const at = i * 4;
  const r = data[at], g = data[at + 1], b = data[at + 2];
  const dominance = g - Math.max(r, b);
  const strength = Math.max(0, Math.min(1, (dominance - 24) / 96));
  data[at + 3] = Math.round(data[at + 3] * (1 - strength));
  if (strength > 0 && data[at + 3] > 0) data[at + 1] = Math.min(g, Math.max(r, b) + 12);
}
await sharp(data, { raw: info }).trim({ background: "#00000000", threshold: 3 })
  .extend({ top: 16, bottom: 16, left: 16, right: 16, background: "#00000000" })
  .png().toFile(output);
console.log(output);
