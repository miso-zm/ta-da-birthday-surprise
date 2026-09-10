import { isIP } from "node:net";
import {
  FIND_GIFT_TARGET_IDS,
  SCRAPBOOK_DESCRIPTION_MAX_LENGTH,
  SCRAPBOOK_TEMPLATE_SLOT_COUNTS,
  type SurpriseContent,
} from "../surprise-contract";
import { PersistenceError } from "./errors";
import type { ValidatedPublication } from "./types";

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PersistenceError("bad-request", `${label} format is invalid.`);
  }
  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): string {
  if (typeof value !== "string") {
    throw new PersistenceError("bad-request", `${label} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new PersistenceError("bad-request", `${label} length is invalid.`);
  }
  return normalized;
}

function validBirthday(value: string): boolean {
  if (!/^\d{4}$/.test(value)) return false;
  const month = Number(value.slice(0, 2));
  const day = Number(value.slice(2));
  const date = new Date(2000, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first >= 224
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function validateGiftUrl(value: string): string {
  if (value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new PersistenceError("bad-request", "Gift URL is invalid.");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PersistenceError("bad-request", "Gift URL is invalid.");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new PersistenceError("bad-request", "Gift URL must be a credential-free HTTPS URL.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    (isIP(hostname) === 4 && isPrivateIpv4(hostname)) ||
    (isIP(hostname) === 6 && isPrivateIpv6(hostname))
  ) {
    throw new PersistenceError("bad-request", "Private-network gift URLs are not allowed.");
  }
  return url.toString();
}

function finiteNumber(value: unknown, label: string, minimum: number, maximum: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new PersistenceError("bad-request", `${label} is invalid.`);
  }
  return value;
}

export function validatePublicationInput(input: unknown): ValidatedPublication {
  const root = record(input, "Publication");
  const recipient = record(root.recipient, "Recipient");
  const sender = record(root.sender, "Sender");
  const opening = record(root.opening, "Opening");
  const unlock = record(root.unlock, "Unlock");
  const memory = record(root.memory, "Memory");
  const gift = record(root.gift, "Gift");
  const share = record(root.share, "Share");

  const recipientName = text(recipient.displayName, "Recipient name", 1, 20);
  const senderName = text(sender.displayName, "Sender name", 1, 20);
  const birthday = text(root.birthday, "Birthday", 4, 4);
  if (!validBirthday(birthday)) {
    throw new PersistenceError("bad-request", "Birthday is invalid.");
  }

  let unlockValue: SurpriseContent["unlock"];
  if (unlock.kind === "none" || unlock.kind === "rps" || unlock.kind === "blow-candles") {
    unlockValue = { kind: unlock.kind };
  } else if (
    unlock.kind === "find-gift" &&
    typeof unlock.targetId === "string" &&
    FIND_GIFT_TARGET_IDS.includes(unlock.targetId as (typeof FIND_GIFT_TARGET_IDS)[number])
  ) {
    unlockValue = {
      kind: "find-gift",
      sceneId: "cozy-room",
      targetId: unlock.targetId as (typeof FIND_GIFT_TARGET_IDS)[number],
    };
  } else {
    throw new PersistenceError("bad-request", "Unlock configuration is invalid.");
  }

  const scrapbookImages: ValidatedPublication["scrapbookImages"] = [];
  let memoryValue: SurpriseContent["memory"];
  if (memory.kind === "card") {
    const card = record(memory.card, "Card");
    const templateId = text(card.templateId, "Card template", 1, 40);
    if (!["coral-birthday", "cream-wishes"].includes(templateId)) {
      throw new PersistenceError("bad-request", "Card template is invalid.");
    }
    memoryValue = {
      kind: "card",
      card: {
        templateId,
        message: text(card.message, "Card message", 10, 200),
        signature: text(card.signature, "Card signature", 1, 20),
      },
    };
  } else if (memory.kind === "scrapbook") {
    const scrapbook = record(memory.scrapbook, "Scrapbook");
    const templateId = text(scrapbook.templateId, "Scrapbook template", 1, 30);
    if (!(templateId in SCRAPBOOK_TEMPLATE_SLOT_COUNTS)) {
      throw new PersistenceError("bad-request", "Scrapbook template is invalid.");
    }
    const typedTemplate = templateId as keyof typeof SCRAPBOOK_TEMPLATE_SLOT_COUNTS;
    if (!Array.isArray(scrapbook.slots) || scrapbook.slots.length !== SCRAPBOOK_TEMPLATE_SLOT_COUNTS[typedTemplate]) {
      throw new PersistenceError("bad-request", "Scrapbook photo count is invalid.");
    }
    const seenIds = new Set<string>();
    const slots = scrapbook.slots.map((rawSlot, index) => {
      const slot = record(rawSlot, `Scrapbook slot ${index + 1}`);
      const id = text(slot.id, "Photo slot id", 1, 50);
      if (seenIds.has(id)) throw new PersistenceError("bad-request", "Photo slot ids must be unique.");
      seenIds.add(id);
      const transform = record(slot.transform, "Photo transform");
      const imageUrl = text(slot.imageUrl, "Photo", 1, 17_000_000);
      if (!imageUrl.startsWith("data:image/")) {
        throw new PersistenceError("bad-request", "Published photos must be uploaded image data.");
      }
      scrapbookImages.push({ slotId: id, dataUrl: imageUrl });
      return {
        id,
        imageUrl,
        transform: {
          x: finiteNumber(transform.x, "Photo x", -1, 1),
          y: finiteNumber(transform.y, "Photo y", -1, 1),
          scale: finiteNumber(transform.scale, "Photo scale", 1, 2.5),
        },
      };
    });
    memoryValue = {
      kind: "scrapbook",
      scrapbook: {
        templateId: typedTemplate,
        description: text(
          scrapbook.description ?? "",
          "Scrapbook description",
          0,
          SCRAPBOOK_DESCRIPTION_MAX_LENGTH,
        ),
        slots,
      },
    };
  } else {
    throw new PersistenceError("bad-request", "Memory configuration is invalid.");
  }

  const giftKind = gift.kind;
  if (giftKind !== "none" && giftKind !== "link") {
    throw new PersistenceError("bad-request", "Gift configuration is invalid.");
  }
  const giftValue = giftKind === "link"
    ? {
        kind: "link" as const,
        title: typeof gift.title === "string" ? gift.title.slice(0, 40).trim() : "",
        description: typeof gift.description === "string" ? gift.description.slice(0, 120).trim() : "",
        externalUrl: validateGiftUrl(text(gift.externalUrl, "Gift URL", 1, 2048)),
      }
    : { kind: "none" as const, title: "", description: "", externalUrl: "" };

  return {
    content: {
      recipient: { displayName: recipientName },
      sender: { displayName: senderName },
      birthday,
      opening: {
        templateId: text(opening.templateId, "Opening template", 1, 40),
        title: text(opening.title, "Opening title", 1, 80),
        prompt: text(opening.prompt, "Opening prompt", 1, 240),
      },
      unlock: unlockValue,
      memory: memoryValue,
      gift: giftValue,
      share: {
        title: text(share.title, "Share title", 1, 80),
        text: text(share.text, "Share text", 1, 240),
      },
    },
    scrapbookImages,
  };
}
