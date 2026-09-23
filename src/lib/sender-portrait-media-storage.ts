import type { SenderDraft } from "./surprise-contract";
import {
  loadSenderDraft,
  saveSenderDraft,
  SENDER_DRAFT_STORAGE_KEY,
  type SenderDraftLoadResult,
  type SenderDraftSaveResult,
} from "./sender-draft-storage";

const DATABASE_NAME = "ta-da:sender-media:v1";
const STORE_NAME = "portrait-media";
const REFERENCE_PREFIX = "idb:portrait:";
const SCRAPBOOK_REFERENCE_PREFIX = "idb:scrapbook:";

type PortraitMediaKind = "sticker" | "poster";

type PortraitMedia = { sticker?: string; poster?: string };
type ScrapbookMedia = {
  slots: SenderDraft["scrapbook"]["slots"];
  missingSlotIds: string[];
};

export type SenderDraftMediaAccess = {
  writeDraftMedia: (draft: SenderDraft) => Promise<void>;
  readPortraitMedia: (draftId: string) => Promise<PortraitMedia>;
  readScrapbookMedia: (draft: SenderDraft) => Promise<ScrapbookMedia>;
};

function mediaKey(draftId: string, kind: PortraitMediaKind) {
  return `${draftId}:${kind}`;
}

function mediaReference(draftId: string, kind: PortraitMediaKind) {
  return `${REFERENCE_PREFIX}${mediaKey(draftId, kind)}`;
}

function scrapbookMediaKey(draftId: string, slotId: string) {
  return `scrapbook:${draftId}:${slotId}`;
}

function scrapbookMediaReference(draftId: string, slotId: string) {
  return `${SCRAPBOOK_REFERENCE_PREFIX}${draftId}:${slotId}`;
}

export function isPortraitMediaReference(value: string) {
  return value.startsWith(REFERENCE_PREFIX);
}

export function isScrapbookMediaReference(value: string) {
  return value.startsWith(SCRAPBOOK_REFERENCE_PREFIX);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("当前浏览器不支持大图片草稿存储。"));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onerror = () => reject(request.error ?? new Error("图片草稿存储无法打开。"));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("图片草稿没有保存。"));
    transaction.onabort = () => reject(transaction.error ?? new Error("图片草稿没有保存。"));
  });
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("图片草稿无法读取。"));
  });
}

async function writeDraftMedia(draft: SenderDraft) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(STORE_NAME);
    if (draft.portrait) {
      if (!isPortraitMediaReference(draft.portrait.stickerImageUrl)) {
        store.put(draft.portrait.stickerImageUrl, mediaKey(draft.draftId, "sticker"));
      }
      if (!isPortraitMediaReference(draft.portrait.posterImageUrl)) {
        store.put(draft.portrait.posterImageUrl, mediaKey(draft.draftId, "poster"));
      }
    }
    draft.scrapbook.slots.forEach((slot) => {
      if (slot.imageUrl && !isScrapbookMediaReference(slot.imageUrl)) {
        store.put(slot.imageUrl, scrapbookMediaKey(draft.draftId, slot.id));
      }
    });
    await done;
  } finally {
    database.close();
  }
}

async function readPortraitMedia(draftId: string): Promise<PortraitMedia> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(STORE_NAME);
    const [sticker, poster] = await Promise.all([
      requestValue(store.get(mediaKey(draftId, "sticker"))),
      requestValue(store.get(mediaKey(draftId, "poster"))),
    ]);
    await done;
    return {
      ...(typeof sticker === "string" ? { sticker } : {}),
      ...(typeof poster === "string" ? { poster } : {}),
    };
  } finally {
    database.close();
  }
}

async function readScrapbookMedia(draft: SenderDraft): Promise<ScrapbookMedia> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(STORE_NAME);
    const missingSlotIds: string[] = [];
    const slots = await Promise.all(draft.scrapbook.slots.map(async (slot) => {
      if (!slot.imageUrl || !isScrapbookMediaReference(slot.imageUrl)) return slot;
      const imageUrl = await requestValue(store.get(scrapbookMediaKey(draft.draftId, slot.id)));
      if (typeof imageUrl !== "string") {
        missingSlotIds.push(slot.id);
        const slotWithoutImage = { ...slot };
        delete slotWithoutImage.imageUrl;
        return slotWithoutImage;
      }
      return { ...slot, imageUrl };
    }));
    await done;
    return { slots, missingSlotIds };
  } finally {
    database.close();
  }
}

const browserMediaAccess: SenderDraftMediaAccess = {
  writeDraftMedia,
  readPortraitMedia,
  readScrapbookMedia,
};

function combineNotices(...notices: Array<string | undefined>) {
  return notices.filter(Boolean).join("");
}

export async function clearSenderPortraitMedia(draftId: string): Promise<void> {
  try {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const done = transactionDone(transaction);
      const store = transaction.objectStore(STORE_NAME);
      const cursorRequest = store.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const key = String(cursor.key);
        if (key.startsWith(`${draftId}:`) || key.startsWith(`scrapbook:${draftId}:`)) {
          cursor.delete();
        }
        cursor.continue();
      };
      await done;
    } finally {
      database.close();
    }
  } catch {
    // Clearing a normal draft must still work when IndexedDB is unavailable.
  }
}

export function withMediaReferencesForStorage(draft: SenderDraft): SenderDraft {
  return {
    ...draft,
    ...(draft.portrait ? {
      portrait: {
        ...draft.portrait,
        stickerImageUrl: mediaReference(draft.draftId, "sticker"),
        posterImageUrl: mediaReference(draft.draftId, "poster"),
      },
    } : {}),
    scrapbook: {
      ...draft.scrapbook,
      slots: draft.scrapbook.slots.map((slot) => slot.imageUrl
        ? { ...slot, imageUrl: scrapbookMediaReference(draft.draftId, slot.id) }
        : slot),
    },
  };
}

export async function saveSenderDraftWithMedia(
  storage: Pick<Storage, "setItem" | "removeItem">,
  draft: SenderDraft,
  mediaAccess: SenderDraftMediaAccess = browserMediaAccess,
): Promise<SenderDraftSaveResult> {
  const hasScrapbookPhotos = draft.scrapbook.slots.some((slot) => Boolean(slot.imageUrl));
  if (!draft.portrait && !hasScrapbookPhotos) {
    void clearSenderPortraitMedia(draft.draftId);
    return saveSenderDraft(storage, draft);
  }
  try {
    await mediaAccess.writeDraftMedia(draft);
    return saveSenderDraft(storage, withMediaReferencesForStorage(draft));
  } catch {
    return { ok: false, reason: "浏览器空间不足，照片草稿暂时无法保存。" };
  }
}

export async function loadSenderDraftWithMedia(
  storage: Pick<Storage, "getItem"> & Partial<Pick<Storage, "setItem">>,
  mediaAccess: SenderDraftMediaAccess = browserMediaAccess,
): Promise<SenderDraftLoadResult> {
  const result = loadSenderDraft(storage);
  if (result.status !== "ready") return result;
  const portrait = result.draft.portrait;
  const hasPortraitReferences = Boolean(
    portrait && (
      isPortraitMediaReference(portrait.stickerImageUrl) ||
      isPortraitMediaReference(portrait.posterImageUrl)
    ),
  );
  const hasScrapbookReferences = result.draft.scrapbook.slots.some(
    (slot) => Boolean(slot.imageUrl && isScrapbookMediaReference(slot.imageUrl)),
  );
  if (!hasPortraitReferences && !hasScrapbookReferences) return result;
  try {
    const media = hasPortraitReferences
      ? await mediaAccess.readPortraitMedia(result.draft.draftId)
      : {};
    const portraitMissing = hasPortraitReferences && (!media.sticker || !media.poster);
    const scrapbookMedia = hasScrapbookReferences
      ? await mediaAccess.readScrapbookMedia(result.draft)
      : { slots: result.draft.scrapbook.slots, missingSlotIds: [] };
    const missingScrapbookSlots = new Set(scrapbookMedia.missingSlotIds);
    const recoveredDraft: SenderDraft = {
      ...result.draft,
      ...(portraitMissing
        ? { portrait: undefined, portraitChoiceMade: false }
        : portrait && media.sticker && media.poster
          ? {
              portrait: {
                ...portrait,
                stickerImageUrl: media.sticker,
                posterImageUrl: media.poster,
              },
            }
          : {}),
      scrapbook: {
        ...result.draft.scrapbook,
        slots: scrapbookMedia.slots,
      },
    };

    if ((portraitMissing || missingScrapbookSlots.size > 0) && storage.setItem) {
      const storageDraft: SenderDraft = {
        ...result.draft,
        ...(portraitMissing ? { portrait: undefined, portraitChoiceMade: false } : {}),
        scrapbook: {
          ...result.draft.scrapbook,
          slots: result.draft.scrapbook.slots.map((slot) => {
            if (!missingScrapbookSlots.has(slot.id)) return slot;
            const slotWithoutImage = { ...slot };
            delete slotWithoutImage.imageUrl;
            return slotWithoutImage;
          }),
        },
      };
      storage.setItem(SENDER_DRAFT_STORAGE_KEY, JSON.stringify(storageDraft));
    }

    const notice = combineNotices(
      result.notice,
      portraitMissing ? "主角海报图片已丢失，请重新上传或跳过。" : undefined,
      missingScrapbookSlots.size > 0 ? "手帐照片有缺失，请重新上传。" : undefined,
    );
    return {
      status: "ready",
      draft: recoveredDraft,
      ...(notice ? { notice } : {}),
    };
  } catch {
    return { status: "invalid", reason: "照片草稿暂时无法读取。" };
  }
}
