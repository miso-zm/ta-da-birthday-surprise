import { isIP } from "node:net";
import { getPublicGiftLink } from "../gift-link-policy";
import {
  FIND_GIFT_TARGET_IDS,
  PORTRAIT_TEMPLATE_IDS,
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

function ipv4Octets(address: string): number[] | null {
  const parts = address.split(".");
  if (
    parts.length !== 4 ||
    parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)
  ) {
    return null;
  }
  return parts.map(Number);
}

function isPrivateIpv4Octets(parts: number[]): boolean {
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

function isPrivateIpv4(hostname: string): boolean {
  const parts = ipv4Octets(hostname);
  return parts ? isPrivateIpv4Octets(parts) : false;
}

function parseIpv6Bytes(address: string): Uint8Array | null {
  let normalized = address.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    const embedded = ipv4Octets(normalized.slice(lastColon + 1));
    if (lastColon < 0 || !embedded) return null;
    normalized = `${normalized.slice(0, lastColon)}:${((embedded[0] << 8) | embedded[1]).toString(16)}:${((embedded[2] << 8) | embedded[3]).toString(16)}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;

  const omitted = 8 - left.length - right.length;
  if ((halves.length === 1 && omitted !== 0) || (halves.length === 2 && omitted < 1)) return null;
  const words = [...left, ...Array.from({ length: omitted }, () => "0"), ...right].map((part) => Number.parseInt(part, 16));
  if (words.length !== 8) return null;

  return Uint8Array.from(words.flatMap((word) => [word >> 8, word & 0xff]));
}

function isPrivateIpv6(hostname: string): boolean {
  const bytes = parseIpv6Bytes(hostname);
  if (!bytes) return false;
  const firstTwelveZero = bytes.slice(0, 12).every((byte) => byte === 0);
  const mappedIpv4 = bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  return (
    bytes.every((byte) => byte === 0) ||
    (firstTwelveZero && bytes[12] === 0 && bytes[13] === 0 && bytes[14] === 0 && bytes[15] === 1) ||
    (bytes[0] & 0xfe) === 0xfc ||
    (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) ||
    bytes[0] === 0xff ||
    ((mappedIpv4 || firstTwelveZero) && isPrivateIpv4Octets(Array.from(bytes.slice(12))))
  );
}

export function validateGiftUrl(value: string): string {
  if (value.length > 4096 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new PersistenceError("bad-request", "Gift URL is invalid.");
  }
  const link = getPublicGiftLink(value);
  if (!link) throw new PersistenceError("bad-request", "礼物链接必须是支持平台的官方送礼链接。");
  const url = new URL(link.url);
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
  return link.url;
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
  let portrait: SurpriseContent["portrait"];
  let portraitImage: string | undefined;
  if (root.portrait !== undefined) {
    const rawPortrait = record(root.portrait, "Portrait poster");
    if (typeof rawPortrait.templateId !== "string" || !PORTRAIT_TEMPLATE_IDS.includes(rawPortrait.templateId as never)) {
      throw new PersistenceError("bad-request", "Portrait template is invalid.");
    }
    portraitImage = text(rawPortrait.imageUrl, "Portrait poster", 1, 17_000_000);
    if (!portraitImage.startsWith("data:image/png;base64,")) {
      throw new PersistenceError("bad-request", "Portrait poster must be a PNG image.");
    }
    portrait = {
      templateId: rawPortrait.templateId as (typeof PORTRAIT_TEMPLATE_IDS)[number],
      imageUrl: portraitImage,
    };
  }

  const recipientName = text(recipient.displayName, "Recipient name", 1, 20);
  const senderName = text(sender.displayName, "Sender name", 1, 20);
  const birthday = root.birthday === undefined ? undefined : text(root.birthday, "Birthday", 4, 4);
  if (birthday !== undefined && !validBirthday(birthday)) {
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
        externalUrl: validateGiftUrl(text(gift.externalUrl, "Gift URL", 1, 4096)),
      }
    : { kind: "none" as const, title: "", description: "", externalUrl: "" };

  return {
    content: {
      recipient: { displayName: recipientName },
      sender: { displayName: senderName },
      ...(birthday === undefined ? {} : { birthday }),
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
      ...(portrait ? { portrait } : {}),
    },
    scrapbookImages,
    ...(portraitImage ? { portraitImage } : {}),
  };
}
