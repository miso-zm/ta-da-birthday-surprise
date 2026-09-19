import type { SenderDraft, SenderPortraitDraft } from "./surprise-contract";
import {
  loadSenderDraft,
  saveSenderDraft,
  type SenderDraftLoadResult,
  type SenderDraftSaveResult,
} from "./sender-draft-storage";

const DATABASE_NAME = "ta-da:sender-media:v1";
const STORE_NAME = "portrait-media";
const REFERENCE_PREFIX = "idb:portrait:";

type PortraitMediaKind = "sticker" | "poster";

function mediaKey(draftId: string, kind: PortraitMediaKind) {
  return `${draftId}:${kind}`;
}

function mediaReference(draftId: string, kind: PortraitMediaKind) {
  return `${REFERENCE_PREFIX}${mediaKey(draftId, kind)}`;
}

export function isPortraitMediaReference(value: string) {
  return value.startsWith(REFERENCE_PREFIX);
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

async function writePortraitMedia(draftId: string, portrait: SenderPortraitDraft) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(portrait.stickerImageUrl, mediaKey(draftId, "sticker"));
    store.put(portrait.posterImageUrl, mediaKey(draftId, "poster"));
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

async function readPortraitMedia(draftId: string): Promise<{ sticker: string; poster: string } | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const [sticker, poster] = await Promise.all([
      requestValue(store.get(mediaKey(draftId, "sticker"))),
      requestValue(store.get(mediaKey(draftId, "poster"))),
    ]);
    await transactionDone(transaction);
    return typeof sticker === "string" && typeof poster === "string" ? { sticker, poster } : null;
  } finally {
    database.close();
  }
}

export async function clearSenderPortraitMedia(draftId: string): Promise<void> {
  try {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.delete(mediaKey(draftId, "sticker"));
      store.delete(mediaKey(draftId, "poster"));
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  } catch {
    // Clearing a normal draft must still work when IndexedDB is unavailable.
  }
}

function withPortraitReferences(draft: SenderDraft): SenderDraft {
  if (!draft.portrait) return draft;
  return {
    ...draft,
    portrait: {
      ...draft.portrait,
      stickerImageUrl: mediaReference(draft.draftId, "sticker"),
      posterImageUrl: mediaReference(draft.draftId, "poster"),
    },
  };
}

export async function saveSenderDraftWithMedia(
  storage: Pick<Storage, "setItem" | "removeItem">,
  draft: SenderDraft,
): Promise<SenderDraftSaveResult> {
  if (!draft.portrait) {
    void clearSenderPortraitMedia(draft.draftId);
    return saveSenderDraft(storage, draft);
  }
  try {
    await writePortraitMedia(draft.draftId, draft.portrait);
    return saveSenderDraft(storage, withPortraitReferences(draft));
  } catch {
    return { ok: false, reason: "浏览器空间不足，主角海报草稿暂时无法保存。" };
  }
}

export async function loadSenderDraftWithMedia(
  storage: Pick<Storage, "getItem">,
): Promise<SenderDraftLoadResult> {
  const result = loadSenderDraft(storage);
  if (result.status !== "ready" || !result.draft.portrait) return result;
  const portrait = result.draft.portrait;
  if (!isPortraitMediaReference(portrait.stickerImageUrl) && !isPortraitMediaReference(portrait.posterImageUrl)) {
    return result;
  }
  try {
    const media = await readPortraitMedia(result.draft.draftId);
    if (!media) return { status: "invalid", reason: "主角海报草稿图片已丢失，请重新上传。" };
    return {
      status: "ready",
      draft: {
        ...result.draft,
        portrait: {
          ...portrait,
          stickerImageUrl: media.sticker,
          posterImageUrl: media.poster,
        },
      },
    };
  } catch {
    return { status: "invalid", reason: "主角海报草稿图片暂时无法读取。" };
  }
}
