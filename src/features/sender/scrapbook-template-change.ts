import type { ScrapbookSlot } from "../../lib/surprise-contract";

export function countDiscardedScrapbookPhotos(
  slots: ScrapbookSlot[],
  nextSlotCount: number,
  brokenPhotoIds: ReadonlySet<string> = new Set(),
): number {
  return slots
    .slice(nextSlotCount)
    .filter((slot) => Boolean(slot.imageUrl) && !brokenPhotoIds.has(slot.id))
    .length;
}
