import { applyMask, fitPortrait, foregroundBounds, MAX_PORTRAIT_BYTES, MODEL_EDGE, normalizeMask, normalizePortrait } from "./mask";

export type PortraitPhase = "decoding" | "loading" | "processing" | "finishing";
export type PortraitCutout = { blob: Blob; width: number; height: number };

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("已取消", "AbortError");
}

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width; element.height = height;
  const context = element.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("浏览器暂不支持照片处理。");
  return { element, context };
}

function infer(pixels: Float32Array, signal: AbortSignal | undefined, onPhase: (phase: PortraitPhase) => void): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    assertNotAborted(signal);
    const worker = new Worker("/workers/portrait-v1.js", { type: "module" });
    let done = false;
    const finish = (error?: Error, result?: Float32Array) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      if (error) reject(error); else resolve(result!);
    };
    const abort = () => finish(new DOMException("已取消", "AbortError"));
    const timer = setTimeout(() => finish(new Error("处理时间较长，请重试或换一张较小的照片。")), 60_000);
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({ data }) => {
      if (data.mask instanceof Float32Array) finish(undefined, data.mask);
      else if (data.error) finish(new Error("暂时无法完成抠图，请重试或换一张照片。"));
      else if (data.phase === "loading" || data.phase === "processing") onPhase(data.phase);
    };
    worker.onerror = () => finish(new Error("抠图组件未能加载，请重试。"));
    worker.onmessageerror = () => finish(new Error("抠图结果无法读取，请重试。"));
    worker.postMessage({ pixels }, [pixels.buffer]);
  });
}

/** Original pixels never leave the browser. PNG canvas encoding strips EXIF. */
export async function removePortraitBackground(file: File, options: { signal?: AbortSignal; onPhase?: (phase: PortraitPhase) => void } = {}): Promise<PortraitCutout> {
  const { signal, onPhase = () => {} } = options;
  assertNotAborted(signal);
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("请使用 JPG、PNG 或 WebP 照片。");
  if (!file.size || file.size > MAX_PORTRAIT_BYTES) throw new Error("照片请控制在 12 MB 以内。");
  onPhase("decoding");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new Error("照片无法读取，请换一张照片。"); }
  try {
    assertNotAborted(signal);
    const size = fitPortrait(bitmap.width, bitmap.height);
    const source = canvas(size.width, size.height);
    source.context.drawImage(bitmap, 0, 0, size.width, size.height);
    const small = canvas(MODEL_EDGE, MODEL_EDGE);
    small.context.fillStyle = "#fff";
    small.context.fillRect(0, 0, MODEL_EDGE, MODEL_EDGE);
    small.context.drawImage(bitmap, 0, 0, MODEL_EDGE, MODEL_EDGE);
    const pixels = normalizePortrait(small.context.getImageData(0, 0, MODEL_EDGE, MODEL_EDGE).data);
    const output = await infer(pixels, signal, onPhase);
    assertNotAborted(signal);
    onPhase("finishing");
    const alpha = normalizeMask(output);
    const mask = small.context.createImageData(MODEL_EDGE, MODEL_EDGE);
    for (let i = 0; i < alpha.length; i++) {
      mask.data[i * 4] = mask.data[i * 4 + 1] = mask.data[i * 4 + 2] = alpha[i];
      mask.data[i * 4 + 3] = 255;
    }
    small.context.putImageData(mask, 0, 0);
    const scaledMask = canvas(size.width, size.height);
    scaledMask.context.imageSmoothingQuality = "high";
    scaledMask.context.drawImage(small.element, 0, 0, size.width, size.height);
    const original = source.context.getImageData(0, 0, size.width, size.height);
    applyMask(original.data, scaledMask.context.getImageData(0, 0, size.width, size.height).data);
    const bounds = foregroundBounds(original.data, size.width, size.height);
    source.context.putImageData(original, 0, 0);
    const cropped = canvas(bounds.width, bounds.height);
    cropped.context.drawImage(source.element, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
    const blob = await new Promise<Blob>((resolve, reject) => cropped.element.toBlob((value) => value ? resolve(value) : reject(new Error("图片生成失败，请重试。")), "image/png"));
    assertNotAborted(signal);
    return { blob, width: bounds.width, height: bounds.height };
  } finally { bitmap.close(); }
}
