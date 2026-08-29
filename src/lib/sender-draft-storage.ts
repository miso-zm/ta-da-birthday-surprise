import {
  FIND_GIFT_TARGET_IDS,
  SCRAPBOOK_DESCRIPTION_MAX_LENGTH,
  SCRAPBOOK_TEMPLATE_SLOT_COUNTS,
  type SenderDraft,
  type SenderUnlockDraft,
  type ScrapbookTemplateId,
} from "./surprise-contract";

export const SENDER_DRAFT_STORAGE_KEY = "ta-da:sender-draft:v1";

export type SenderDraftLoadResult =
  | { status: "empty" }
  | { status: "ready"; draft: SenderDraft }
  | { status: "invalid"; reason: string };

export type SenderDraftSaveResult =
  | { ok: true }
  | { ok: false; reason: string };

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

const LEGACY_FIND_GIFT_TARGETS = {
  "cabinet-gift": "rug-box",
  "sofa-gift": "sofa-box",
  "plant-gift": "plant-box",
} as const;

function migrateLegacySenderDraft(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  let migrated = value;

  if (isRecord(migrated.unlock) && migrated.unlock.kind === "birthday-password") {
    migrated = { ...migrated, unlock: { kind: "blow-candles" } };
  }

  if (
    isRecord(migrated.unlock) &&
    migrated.unlock.kind === "find-gift" &&
    isString(migrated.unlock.targetId) &&
    migrated.unlock.targetId in LEGACY_FIND_GIFT_TARGETS
  ) {
    const legacyTarget = migrated.unlock.targetId as keyof typeof LEGACY_FIND_GIFT_TARGETS;
    migrated = {
      ...migrated,
      unlock: {
        ...migrated.unlock,
        targetId: LEGACY_FIND_GIFT_TARGETS[legacyTarget],
      },
    };
  }

  if (isRecord(migrated.gift) && migrated.gift.kind === undefined) {
    migrated = {
      ...migrated,
      gift: {
        ...migrated.gift,
        kind: isString(migrated.gift.externalUrl) && migrated.gift.externalUrl.trim()
          ? "link"
          : "none",
      },
    };
  }

  if (isRecord(migrated.scrapbook) && Array.isArray(migrated.scrapbook.slots)) {
    const legacySlots = migrated.scrapbook.slots.filter(isRecord);
    const rawTemplate = isString(migrated.scrapbook.templateId)
      ? migrated.scrapbook.templateId
      : "one-photo";
    const templateId: ScrapbookTemplateId = rawTemplate === "one-photo" || rawTemplate === "one-memory"
      ? "one-photo"
      : rawTemplate === "two-photo" || rawTemplate === "two-memories"
        ? "two-photo"
        : "three-photo";
    const slotCount = SCRAPBOOK_TEMPLATE_SLOT_COUNTS[templateId];
    const firstLegacyCaption = legacySlots
      .map((slot) => slot.caption)
      .find(isString);
    const legacyDescription = isString(migrated.scrapbook.description)
      ? migrated.scrapbook.description
      : isString(migrated.scrapbook.title)
        ? migrated.scrapbook.title
        : firstLegacyCaption;
    const slots = Array.from({ length: slotCount }, (_, index) => {
      const oldSlot = legacySlots[index];
      const oldTransform = oldSlot && isRecord(oldSlot.transform) ? oldSlot.transform : null;
      return {
        id: oldSlot && isString(oldSlot.id) ? oldSlot.id : `memory-${index + 1}`,
        ...(oldSlot && isString(oldSlot.imageUrl) ? { imageUrl: oldSlot.imageUrl } : {}),
        transform: {
          x: oldTransform && typeof oldTransform.x === "number" ? oldTransform.x : 0,
          y: oldTransform && typeof oldTransform.y === "number" ? oldTransform.y : 0,
          scale: oldTransform && typeof oldTransform.scale === "number" ? oldTransform.scale : 1,
        },
      };
    });
    migrated = {
      ...migrated,
      version: 2,
      scrapbook: {
        templateId,
        description: isString(legacyDescription)
          ? legacyDescription.slice(0, SCRAPBOOK_DESCRIPTION_MAX_LENGTH)
          : "",
        slots,
      },
    };
  }

  return migrated;
}

function isSenderUnlockDraft(value: unknown): value is SenderUnlockDraft {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.kind === "none" ||
    value.kind === "rps" ||
    value.kind === "blow-candles"
  ) {
    return true;
  }

  return (
    value.kind === "find-gift" &&
    isString(value.targetId) &&
    FIND_GIFT_TARGET_IDS.includes(
      value.targetId as (typeof FIND_GIFT_TARGET_IDS)[number],
    )
  );
}

function isScrapbookSlot(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    (value.imageUrl === undefined || isString(value.imageUrl)) &&
    isRecord(value.transform) &&
    typeof value.transform.x === "number" &&
    typeof value.transform.y === "number" &&
    typeof value.transform.scale === "number"
  );
}

function hasSenderDraftShape(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || value.version !== 2) {
    return false;
  }

  return (
    typeof value.draftId === "string" &&
    typeof value.updatedAt === "string" &&
    isRecord(value.basics) &&
    isSenderUnlockDraft(value.unlock) &&
    isRecord(value.card) &&
    isRecord(value.scrapbook) &&
    isRecord(value.gift) &&
    isString(value.basics.recipientName) &&
    isString(value.basics.senderName) &&
    isString(value.basics.birthday) &&
    isString(value.basics.openingTemplateId) &&
    isString(value.basics.openingTitle) &&
    isString(value.basics.openingPrompt) &&
    isString(value.card.templateId) &&
    isString(value.card.message) &&
    isString(value.card.signature) &&
    isString(value.scrapbook.templateId) &&
    value.scrapbook.templateId in SCRAPBOOK_TEMPLATE_SLOT_COUNTS &&
    isString(value.scrapbook.description) &&
    Array.isArray(value.scrapbook.slots) &&
    value.scrapbook.slots.every(isScrapbookSlot) &&
    (value.gift.kind === "none" || value.gift.kind === "link") &&
    isString(value.gift.title) &&
    isString(value.gift.description) &&
    isString(value.gift.externalUrl)
  );
}

export function isSenderDraft(value: unknown): value is SenderDraft {
  return (
    hasSenderDraftShape(value) &&
    (value.memoryKind === "card" || value.memoryKind === "scrapbook")
  );
}

export function loadSenderDraft(
  storage: ReadableStorage,
): SenderDraftLoadResult {
  const serialized = storage.getItem(SENDER_DRAFT_STORAGE_KEY);

  if (!serialized) {
    return { status: "empty" };
  }

  try {
    const parsed: unknown = JSON.parse(serialized);
    const migrated = migrateLegacySenderDraft(parsed);

    if (isSenderDraft(migrated)) {
      return { status: "ready", draft: migrated };
    }
    if (hasSenderDraftShape(migrated) && migrated.memoryKind === undefined) {
      return {
        status: "ready",
        draft: { ...migrated, memoryKind: "card" } as SenderDraft,
      };
    }
    return { status: "invalid", reason: "草稿格式已过期或不完整。" };
  } catch {
    return { status: "invalid", reason: "草稿内容无法读取。" };
  }
}

export function saveSenderDraft(
  storage: WritableStorage,
  draft: SenderDraft,
): SenderDraftSaveResult {
  try {
    storage.setItem(SENDER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return { ok: true };
  } catch {
    return { ok: false, reason: "浏览器空间不足，草稿暂时无法保存。" };
  }
}

export function clearSenderDraft(storage: WritableStorage): void {
  storage.removeItem(SENDER_DRAFT_STORAGE_KEY);
}

export function getBrowserDraftStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
