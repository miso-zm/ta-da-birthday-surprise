import type { Surprise } from "./surprise-contract";

function mediaUrls(surprise: Surprise): string[] {
  const urls = surprise.memory.kind === "scrapbook"
    ? surprise.memory.scrapbook.slots.flatMap((slot) => slot.imageUrl ? [slot.imageUrl] : [])
    : [];
  if (surprise.portrait?.imageUrl) urls.push(surprise.portrait.imageUrl);
  return urls;
}

export function getEarliestMediaExpiry(surprise: Surprise): number | null {
  const expiries = mediaUrls(surprise).flatMap((source) => {
    try {
      const url = new URL(source);
      if (url.pathname.startsWith("/api/media/") && /^\d{10,12}$/.test(url.searchParams.get("expires") ?? "")) {
        return [Number(url.searchParams.get("expires")) * 1000];
      }
    } catch {
      // Browser-local data/blob URLs intentionally have no renewable expiry.
    }
    return [];
  });
  return expiries.length > 0 ? Math.min(...expiries) : null;
}

export function mergeRefreshedMedia(current: Surprise, refreshed: Surprise): Surprise {
  if (current.id !== refreshed.id || current.slug !== refreshed.slug) return current;
  let memory = current.memory;
  if (
    current.memory.kind === "scrapbook"
    && refreshed.memory.kind === "scrapbook"
    && current.memory.scrapbook.templateId === refreshed.memory.scrapbook.templateId
  ) {
    const refreshedById = new Map(
      refreshed.memory.scrapbook.slots.map((slot) => [slot.id, slot.imageUrl]),
    );
    memory = {
      kind: "scrapbook",
      scrapbook: {
        ...current.memory.scrapbook,
        slots: current.memory.scrapbook.slots.map((slot) => ({
          ...slot,
          imageUrl: refreshedById.get(slot.id) ?? slot.imageUrl,
        })),
      },
    };
  }
  const portrait = current.portrait && refreshed.portrait
    && current.portrait.templateId === refreshed.portrait.templateId
    ? { ...current.portrait, imageUrl: refreshed.portrait.imageUrl }
    : current.portrait;
  return { ...current, memory, ...(portrait ? { portrait } : {}) };
}
