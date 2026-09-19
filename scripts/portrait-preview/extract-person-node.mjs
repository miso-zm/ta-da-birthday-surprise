// Local-only helper for design previews. Production uploads use the browser worker.
import * as ort from "onnxruntime-web";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node extract-person-node.mjs input.png output.png");

const edge = 320;
const root = fileURLToPath(new URL("../../", import.meta.url));
const model = await readFile(`${root}public/models/portrait/u2netp-v1/model.onnx`);
const original = sharp(input).rotate().ensureAlpha();
const metadata = await original.metadata();
if (!metadata.width || !metadata.height) throw new Error("Invalid image dimensions");

const small = await original.clone().flatten({ background: "#fff" }).resize(edge, edge, { fit: "fill" }).ensureAlpha().raw().toBuffer();
const size = edge * edge;
const pixels = new Float32Array(size * 3);
let maximum = 1;
for (let p = 0; p < size; p++) for (let c = 0; c < 3; c++) {
  const value = small[p * 4 + c];
  pixels[c * size + p] = value;
  maximum = Math.max(maximum, value);
}
const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
for (let c = 0; c < 3; c++) for (let p = 0; p < size; p++) pixels[c * size + p] = (pixels[c * size + p] / maximum - mean[c]) / std[c];

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
const tensor = new ort.Tensor("float32", pixels, [1, 3, edge, edge]);
const result = await session.run({ [session.inputNames[0]]: tensor });
const values = result[session.outputNames[0]].data;
let min = Infinity, max = -Infinity;
for (const value of values) { min = Math.min(min, value); max = Math.max(max, value); }
if (!(max - min > 0.00001)) throw new Error("No clear subject detected");
const mask = Buffer.alloc(size);
for (let i = 0; i < size; i++) mask[i] = Math.round(255 * (values[i] - min) / (max - min));
const scaledMask = await sharp(mask, { raw: { width: edge, height: edge, channels: 1 } })
  .resize(metadata.width, metadata.height, { fit: "fill" }).blur(0.35).raw().toBuffer();
const { data, info } = await original.raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < info.width * info.height; i++) data[i * 4 + 3] = Math.round(data[i * 4 + 3] * scaledMask[i] / 255);
await sharp(data, { raw: info }).trim({ background: "#00000000", threshold: 5 })
  .extend({ top: 16, bottom: 16, left: 16, right: 16, background: "#00000000" }).png().toFile(output);
for (const item of Object.values(result)) item.dispose();
tensor.dispose();
await session.release();
console.log(output);
