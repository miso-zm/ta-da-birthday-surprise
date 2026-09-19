import {
  PORTRAIT_TEMPLATE_IDS,
  type PortraitTemplateId,
  type PortraitTransform,
} from "../surprise-contract";

export const PORTRAIT_TEMPLATE_SIZE = 720;

export type NormalizedPlacement = PortraitTransform;

type LayerPlacement = NormalizedPlacement & { src: string };

export const balloonTemplate = {
  id: "balloon" as const,
  background: {
    src: "/assets/portrait/balloon/background-v1.png",
    centerX: 0.5,
    centerY: 0.45,
    width: 0.97,
    rotation: 0,
  },
  portrait: { centerX: 0.5, centerY: 0.65, width: 0.68, rotation: 0 },
  foreground: [
    {
      src: "/assets/portrait/balloon/gift-star-v1.png",
      centerX: 0.18,
      centerY: 0.73,
      width: 0.3,
      rotation: -0.035,
    },
    {
      src: "/assets/portrait/balloon/cake-v1.png",
      centerX: 0.8,
      centerY: 0.72,
      width: 0.35,
      rotation: 0.025,
    },
  ],
};

export const blueTemplate = {
  id: "blue" as const,
  background: {
    src: "/assets/portrait/blue/background-v1.png",
    centerX: 0.5,
    centerY: 0.48,
    width: 0.86,
    rotation: 0,
  },
  portrait: { centerX: 0.5, centerY: 0.65, width: 0.68, rotation: 0 },
  foreground: [
    {
      src: "/assets/portrait/blue/confetti-v1.png",
      centerX: 0.22,
      centerY: 0.31,
      width: 0.125,
      rotation: -0.035,
    },
    {
      src: "/assets/portrait/blue/sparkles-v1.png",
      centerX: 0.79,
      centerY: 0.34,
      width: 0.105,
      rotation: 0.025,
    },
    {
      src: "/assets/portrait/blue/gift-v1.png",
      centerX: 0.18,
      centerY: 0.51,
      width: 0.145,
      rotation: -0.035,
    },
    {
      src: "/assets/portrait/blue/star-v1.png",
      centerX: 0.17,
      centerY: 0.73,
      width: 0.21,
      rotation: -0.025,
    },
    {
      src: "/assets/portrait/blue/cake-v1.png",
      centerX: 0.8,
      centerY: 0.72,
      width: 0.34,
      rotation: 0.018,
    },
  ],
};

export function clampPlacement(value: NormalizedPlacement): NormalizedPlacement {
  if (![value.centerX, value.centerY, value.width, value.rotation].every(Number.isFinite)) {
    throw new Error("模板位置无效。");
  }
  return {
    centerX: Math.min(0.82, Math.max(0.18, value.centerX)),
    centerY: Math.min(0.82, Math.max(0.2, value.centerY)),
    width: Math.min(0.76, Math.max(0.38, value.width)),
    rotation: Math.min(0.18, Math.max(-0.18, value.rotation)),
  };
}

export function placementRect(
  imageWidth: number,
  imageHeight: number,
  placement: NormalizedPlacement,
  canvasSize = PORTRAIT_TEMPLATE_SIZE,
) {
  if (![imageWidth, imageHeight, canvasSize].every(Number.isFinite) || imageWidth <= 0 || imageHeight <= 0 || canvasSize <= 0) {
    throw new Error("模板图层尺寸无效。");
  }
  const width = placement.width * canvasSize;
  const height = width * imageHeight / imageWidth;
  return {
    x: placement.centerX * canvasSize - width / 2,
    y: placement.centerY * canvasSize - height / 2,
    width,
    height,
    rotation: placement.rotation,
  };
}

function canvasSurface(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器暂不支持模板合成。");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return { canvas, context };
}

async function bitmapFromUrl(src: string, signal?: AbortSignal) {
  const response = await fetch(src, { signal });
  if (!response.ok) throw new Error("模板素材加载失败，请重试。");
  return createImageBitmap(await response.blob());
}

function drawPlacement(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  placement: NormalizedPlacement,
  canvasSize: number,
) {
  const rect = placementRect(bitmap.width, bitmap.height, placement, canvasSize);
  context.save();
  context.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
  context.rotate(rect.rotation);
  context.drawImage(bitmap, -rect.width / 2, -rect.height / 2, rect.width, rect.height);
  context.restore();
}

/** Produces the artwork only. Receiver text and controls stay live HTML. */
export async function composePortraitTemplate(options: {
  sticker: Blob;
  template?: PortraitTemplateId;
  portrait?: Partial<NormalizedPlacement>;
  signal?: AbortSignal;
}) {
  if (options.template && !PORTRAIT_TEMPLATE_IDS.includes(options.template)) throw new Error("暂不支持这个模板。");
  if (!options.sticker.type.startsWith("image/")) throw new Error("请提供处理后的人像图片。");
  const template = options.template === "blue" ? blueTemplate : balloonTemplate;
  const portrait = clampPlacement({ ...template.portrait, ...options.portrait });
  const assetLayers: LayerPlacement[] = [template.background, ...template.foreground];
  const [sticker, ...assets] = await Promise.all([
    createImageBitmap(options.sticker),
    ...assetLayers.map((layer) => bitmapFromUrl(layer.src, options.signal)),
  ]);
  try {
    if (options.signal?.aborted) throw new DOMException("已取消", "AbortError");
    const { canvas, context } = canvasSurface(PORTRAIT_TEMPLATE_SIZE);
    drawPlacement(context, assets[0], template.background, PORTRAIT_TEMPLATE_SIZE);
    drawPlacement(context, sticker, portrait, PORTRAIT_TEMPLATE_SIZE);
    template.foreground.forEach((layer, index) => drawPlacement(context, assets[index + 1], layer, PORTRAIT_TEMPLATE_SIZE));
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("模板生成失败，请重试。")), "image/png");
    });
    if (options.signal?.aborted) throw new DOMException("已取消", "AbortError");
    return { blob, width: PORTRAIT_TEMPLATE_SIZE, height: PORTRAIT_TEMPLATE_SIZE, portrait };
  } finally {
    sticker.close();
    assets.forEach((asset) => asset.close());
  }
}
