import type { ScrapbookPhotoTransform, ScrapbookSlot } from "@/lib/surprise-contract";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeScrapbookTransform(
  transform: ScrapbookPhotoTransform,
): ScrapbookPhotoTransform {
  return {
    x: Number.isFinite(transform.x) ? clamp(transform.x, -1, 1) : 0,
    y: Number.isFinite(transform.y) ? clamp(transform.y, -1, 1) : 0,
    scale: Number.isFinite(transform.scale) ? clamp(transform.scale, 1, 2.5) : 1,
  };
}

export function getPhotoTransformStyle(transform: ScrapbookPhotoTransform) {
  const maxOffset = ((transform.scale - 1) / transform.scale) * 50;
  return {
    transform: `translate(${transform.x * maxOffset}%, ${transform.y * maxOffset}%) scale(${transform.scale})`,
  };
}

export function getImageFailureKey(slot: ScrapbookSlot): string {
  return `${slot.id}:${slot.imageUrl ?? ""}`;
}
