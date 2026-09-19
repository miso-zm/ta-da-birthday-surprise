/** Pure, independently testable image math. No network or browser globals. */
export const MODEL_EDGE = 320;
export const MAX_PORTRAIT_EDGE = 1600;
export const MAX_PORTRAIT_PIXELS = 24_000_000;
export const MAX_PORTRAIT_BYTES = 12 * 1024 * 1024;

export function fitPortrait(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 64 || height < 64 || width * height > MAX_PORTRAIT_PIXELS) {
    throw new Error("请选择清晰照片（至少 64 像素，不超过 2400 万像素）。");
  }
  const ratio = Math.min(1, MAX_PORTRAIT_EDGE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

/** U²-Net input is NCHW, normalised by image maximum then ImageNet mean/std. */
export function normalizePortrait(rgba: Uint8ClampedArray, edge = MODEL_EDGE): Float32Array {
  const size = edge * edge;
  if (rgba.length !== size * 4) throw new Error("照片像素不完整。");
  const rgb = new Float32Array(size * 3);
  let maximum = 1;
  // Composite transparent inputs on white for inference; preserve alpha in output.
  for (let p = 0; p < size; p++) {
    const alpha = rgba[p * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) {
      const value = rgba[p * 4 + c] * alpha + 255 * (1 - alpha);
      rgb[c * size + p] = value;
      maximum = Math.max(maximum, value);
    }
  }
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  for (let c = 0; c < 3; c++) {
    for (let p = 0; p < size; p++) rgb[c * size + p] = (rgb[c * size + p] / maximum - mean[c]) / std[c];
  }
  return rgb;
}

export function normalizeMask(values: Float32Array, edge = MODEL_EDGE): Uint8ClampedArray {
  if (values.length !== edge * edge) throw new Error("抠图结果尺寸异常，请重试。");
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) throw new Error("抠图结果异常，请换一张照片。");
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (max - min < 0.00001) throw new Error("没有识别到清晰主体，请换一张照片。");
  const alpha = new Uint8ClampedArray(values.length);
  for (let i = 0; i < values.length; i++) alpha[i] = Math.round(255 * (values[i] - min) / (max - min));
  return alpha;
}

/** Keep RGB unchanged, multiplying rather than replacing pre-existing alpha. */
export function applyMask(rgba: Uint8ClampedArray, maskRgba: Uint8ClampedArray) {
  if (rgba.length !== maskRgba.length || rgba.length % 4) throw new Error("照片与遮罩尺寸不一致。");
  for (let i = 0; i < rgba.length; i += 4) rgba[i + 3] = Math.round(rgba[i + 3] * maskRgba[i] / 255);
}

export function foregroundBounds(rgba: Uint8ClampedArray, width: number, height: number) {
  if (rgba.length !== width * height * 4) throw new Error("照片尺寸不一致。");
  let left = width, top = height, right = -1, bottom = -1, count = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (rgba[(y * width + x) * 4 + 3] <= 12) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y); count++;
  }
  if (count < Math.max(16, width * height * 0.005)) throw new Error("没有识别到清晰主体，请换一张照片。");
  const padding = Math.max(2, Math.round(Math.max(width, height) * 0.01));
  left = Math.max(0, left - padding); top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding); bottom = Math.min(height - 1, bottom + padding);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}
