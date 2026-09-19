/** Sticker geometry uses CSS pixels, independently of the uploaded resolution. */
export function stickerGeometry(width: number, height: number, displayWidth = 280, pixelRatio = 2) {
  if (![width, height, displayWidth, pixelRatio].every(Number.isFinite) || width <= 0 || height <= 0 || displayWidth < 64 || displayWidth > 430 || pixelRatio < 1 || pixelRatio > 3) throw new Error("贴纸尺寸无效。");
  const scale = displayWidth * pixelRatio / width;
  const imageWidth = Math.round(width * scale), imageHeight = Math.round(height * scale);
  if (imageHeight > 4096) throw new Error("照片过于狭长，请换一张照片。");
  const padding = Math.ceil(12 * pixelRatio);
  return { imageWidth, imageHeight, padding, radius: Math.round(3 * pixelRatio), inset: Math.round(pixelRatio), width: imageWidth + padding * 2, height: imageHeight + padding * 2, pixelRatio };
}

/** Circular maximum alpha: soft edges remain soft, RGB is never altered. */
export function dilateAlpha(rgba: Uint8ClampedArray, width: number, height: number, radius: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width * height > 6_000_000 || rgba.length !== width * height * 4 || !Number.isInteger(radius) || radius < 0 || radius > 9) throw new Error("贴纸轮廓尺寸无效。");
  const alpha = new Uint8ClampedArray(width * height);
  for (let dy = -radius; dy <= radius; dy++) {
    const dxLimit = Math.floor(Math.sqrt(radius * radius - dy * dy));
    for (let dx = -dxLimit; dx <= dxLimit; dx++) {
      const xStart = Math.max(0, -dx), xEnd = Math.min(width, width - dx);
      const yStart = Math.max(0, -dy), yEnd = Math.min(height, height - dy);
      for (let y = yStart; y < yEnd; y++) {
        let target = y * width + xStart;
        let source = ((y + dy) * width + xStart + dx) * 4 + 3;
        for (let x = xStart; x < xEnd; x++, target++, source += 4) alpha[target] = Math.max(alpha[target], rgba[source]);
      }
    }
  }
  return alpha;
}

/** Shrink only the displayed subject alpha, revealing the white layer over its fringe. */
export function insetSubjectAlpha(rgba: Uint8ClampedArray, width: number, height: number, radius: number) {
  const inverted = new Uint8ClampedArray(rgba.length);
  for (let i = 3; i < rgba.length; i += 4) inverted[i] = 255 - rgba[i];
  const expanded = dilateAlpha(inverted, width, height, radius);
  const result = rgba.slice();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    result[i * 4 + 3] = x < radius || y < radius || x >= width - radius || y >= height - radius ? 0 : 255 - expanded[i];
  }
  return result;
}

function unitNoise(index: number) {
  let value = Math.imul(index ^ 0x45d9f3b, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

function smoothNoise(position: number, wavelength: number) {
  const cell = Math.floor(position / wavelength);
  const fraction = position / wavelength - cell;
  const eased = fraction * fraction * (3 - 2 * fraction);
  return unitNoise(cell) * (1 - eased) + unitNoise(cell + 1) * eased;
}

/**
 * Cuts the subject itself along a deterministic, fibrous-looking lower edge.
 * The returned alpha belongs to the sticker and therefore moves/scales with it.
 */
export function applyTornBottomMask(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  depth: number,
  baselineRatio = 0.8,
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width * height > 6_000_000 || rgba.length !== width * height * 4 || !Number.isInteger(depth) || depth < 3 || depth > 64 || !Number.isFinite(baselineRatio) || baselineRatio < 0.65 || baselineRatio > 0.9) {
    throw new Error("撕纸蒙版尺寸无效。");
  }
  const result = rgba.slice();
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (rgba[(y * width + x) * 4 + 3] > 8) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxY < 0) return result;
  const baseline = minY + (maxY - minY) * baselineRatio;

  for (let x = minX; x <= maxX; x++) {
    const localX = x - minX;
    const broad = smoothNoise(localX + 41, Math.max(17, depth * 2.35)) - 0.5;
    const fibres = smoothNoise(localX + 7, Math.max(6, depth * 0.68)) - 0.5;
    const flecks = smoothNoise(localX + 29, Math.max(3, depth * 0.24)) - 0.5;
    const grain = unitNoise(localX + 97) - 0.5;
    const offset = depth * (broad * 0.86 + fibres * 0.38 + flecks * 0.16 + grain * 0.06);
    const cutoff = Math.min(baseline + depth * 0.42, Math.max(baseline - depth * 0.56, baseline + offset));
    const startY = Math.max(0, Math.floor(cutoff - 1));
    for (let y = startY; y < height; y++) {
      const alphaIndex = (y * width + x) * 4 + 3;
      const coverage = Math.max(0, Math.min(1, cutoff + 0.75 - y));
      result[alphaIndex] = Math.round(result[alphaIndex] * coverage);
    }
  }
  return result;
}

function surface(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("浏览器暂不支持贴纸处理。");
  return { canvas, context };
}

/** Input must be a cutout, not an original photo. Returns a new PNG, no mutation. */
export async function createPortraitSticker(cutout: Blob, options: { displayWidth?: number; pixelRatio?: number; signal?: AbortSignal } = {}) {
  const check = () => { if (options.signal?.aborted) throw new DOMException("已取消", "AbortError"); };
  check();
  const bitmap = await createImageBitmap(cutout);
  try {
    check();
    const g = stickerGeometry(bitmap.width, bitmap.height, options.displayWidth, options.pixelRatio);
    const subject = surface(g.width, g.height);
    subject.context.imageSmoothingQuality = "high";
    subject.context.drawImage(bitmap, g.padding, g.padding, g.imageWidth, g.imageHeight);
    const original = subject.context.getImageData(0, 0, g.width, g.height);
    original.data.set(applyTornBottomMask(original.data, g.width, g.height, Math.round(12 * g.pixelRatio)));
    const alpha = dilateAlpha(original.data, g.width, g.height, g.radius);
    // Keep the outer contour fixed, but expose warm white ~1 CSS px inside it.
    // Use a copy: the original cutout remains available for future editing.
    const inset = insetSubjectAlpha(original.data, g.width, g.height, g.inset);
    original.data.set(inset);
    subject.context.putImageData(original, 0, 0);
    const outline = surface(g.width, g.height);
    const image = outline.context.createImageData(g.width, g.height);
    for (let i = 0; i < alpha.length; i++) {
      image.data[i * 4] = 255; image.data[i * 4 + 1] = 253; image.data[i * 4 + 2] = 249; image.data[i * 4 + 3] = alpha[i];
    }
    outline.context.putImageData(image, 0, 0);
    const result = surface(g.width, g.height);
    result.context.shadowColor = "rgba(43,33,22,0.10)";
    result.context.shadowBlur = 2 * g.pixelRatio;
    result.context.shadowOffsetY = g.pixelRatio;
    result.context.drawImage(outline.canvas, 0, 0);
    result.context.shadowColor = "transparent";
    result.context.drawImage(subject.canvas, 0, 0);
    check();
    const blob = await new Promise<Blob>((resolve, reject) => result.canvas.toBlob(value => value ? resolve(value) : reject(new Error("贴纸生成失败，请重试。")), "image/png"));
    check();
    return { blob, width: g.width, height: g.height, displayWidth: g.width / g.pixelRatio, contentOffset: g.padding / g.pixelRatio };
  } finally { bitmap.close(); }
}
