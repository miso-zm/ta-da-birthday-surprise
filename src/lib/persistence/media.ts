import sharp from "sharp";
import { PersistenceError } from "./errors";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_INPUT_PIXELS = 24_000_000;
const MAX_OUTPUT_EDGE = 2400;

const formats = {
  jpeg: { mimeType: "image/jpeg", extension: "jpg" },
  png: { mimeType: "image/png", extension: "png" },
  webp: { mimeType: "image/webp", extension: "webp" },
} as const;

export type SanitizedImage = {
  bytes: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
};

type SharpMetadata = Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;

function parseDataUrl(dataUrl: string): { declaredMime: string; bytes: Buffer } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new PersistenceError("bad-request", "Only JPEG, PNG, and WebP photos are supported.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    throw new PersistenceError("bad-request", "Each photo must be 12 MB or smaller.");
  }
  return { declaredMime: match[1], bytes };
}

export async function sanitizeImage(dataUrl: string): Promise<SanitizedImage> {
  const { declaredMime, bytes } = parseDataUrl(dataUrl);
  let metadata: SharpMetadata;
  try {
    metadata = await sharp(bytes, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new PersistenceError("bad-request", "Photo data is damaged or too large.");
  }
  if (!metadata.format || !(metadata.format in formats) || !metadata.width || !metadata.height) {
    throw new PersistenceError("bad-request", "Photo format is not supported.");
  }
  if ((metadata.pages ?? 1) !== 1 || metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw new PersistenceError("bad-request", "Animated or oversized photos are not supported.");
  }

  const format = metadata.format as keyof typeof formats;
  const target = formats[format];
  if (declaredMime !== target.mimeType) {
    throw new PersistenceError("bad-request", "Photo content does not match its declared format.");
  }

  let pipeline = sharp(bytes, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize(MAX_OUTPUT_EDGE, MAX_OUTPUT_EDGE, { fit: "inside", withoutEnlargement: true });
  if (format === "jpeg") pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true });
  if (format === "png") pipeline = pipeline.png({ compressionLevel: 9 });
  if (format === "webp") pipeline = pipeline.webp({ quality: 88 });

  const result = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    bytes: result.data,
    mimeType: target.mimeType,
    extension: target.extension,
    width: result.info.width,
    height: result.info.height,
  };
}
