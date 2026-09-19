import type { PublishedSurpriseLinks } from "./surprise-contract";

const KEY = "ta-da:published-works:v1";
export type PublishedWork = PublishedSurpriseLinks & { recipientName: string; memoryKind: "card" | "scrapbook" };

export function readPublishedWorks(storage: Pick<Storage, "getItem">, origin: string): PublishedWork[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((item): item is PublishedWork => {
      if (!item || typeof item !== "object") return false;
      const work = item as PublishedWork;
      if (typeof work.publicationId !== "string" || !/^[a-f0-9]{32}$/.test(work.publicationId) || seen.has(work.publicationId)) return false;
      if (typeof work.recipientName !== "string" || work.recipientName.length > 20 || !["card", "scrapbook"].includes(work.memoryKind)) return false;
      if (typeof work.expiresAt !== "string" || !Number.isFinite(Date.parse(work.expiresAt))) return false;
      const share = new URL(work.shareUrl);
      const manage = new URL(work.manageUrl);
      if (share.origin !== origin || manage.origin !== origin || share.search || share.hash || manage.search || manage.hash) return false;
      if (!/^\/s\/[A-Za-z0-9_-]{43}$/.test(share.pathname) || manage.pathname !== `/create/manage/${work.publicationId}`) return false;
      seen.add(work.publicationId);
      return true;
    }).slice(0, 100);
  } catch {
    return [];
  }
}

export function rememberPublishedWork(storage: Pick<Storage, "getItem" | "setItem">, work: PublishedWork, origin: string): boolean {
  try {
    const current = readPublishedWorks(storage, origin);
    storage.setItem(KEY, JSON.stringify([work, ...current.filter((item) => item.publicationId !== work.publicationId)].slice(0, 100)));
    return true;
  } catch {
    return false;
  }
}
