import type {
  PublishedSurpriseLinks,
  ScrapbookContent,
  SurpriseContent,
} from "../surprise-contract";
import type { PersistenceConfig } from "./config";
import {
  deriveToken,
  hashSecret,
  safeEqual,
  sha256,
  sign,
  stableStringify,
} from "./crypto";
import { PersistenceError } from "./errors";
import { FileStore } from "./file-store";
import { sanitizeImage, type SanitizedImage } from "./media";
import {
  PUBLICATION_SCHEMA_VERSION,
  type LoadedPublication,
  type ManagedPublication,
  type MediaRecord,
  type PublicationRecord,
  type PublicIndexRecord,
  type StoredSurpriseContent,
} from "./types";
import { validatePublicationInput } from "./validation";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ID_PATTERN = /^[a-f0-9]{32}$/;
const MEDIA_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const MEDIA_TTL_SECONDS = 10 * 60;

type Clock = () => Date;

export type PublishedResult = PublishedSurpriseLinks & {
  managerToken: string;
};

export type MediaResult = {
  bytes: Buffer;
  mimeType: MediaRecord["mimeType"];
};

function validManagerToken(value: string | undefined): value is string {
  return Boolean(value && TOKEN_PATTERN.test(value));
}

function activeStatus(record: PublicationRecord, now: Date): "active" | "closed" {
  return record.status === "active" && new Date(record.expiresAt).getTime() > now.getTime()
    ? "active"
    : "closed";
}

export class PublicationService {
  readonly store: FileStore;

  constructor(
    readonly config: PersistenceConfig,
    private readonly clock: Clock = () => new Date(),
  ) {
    this.store = new FileStore(config.dataDir);
  }

  private recordPath(id: string) {
    return `records/${id}.json`;
  }

  private publicPath(publicTokenHash: string) {
    return `public/${publicTokenHash}.json`;
  }

  private mediaPath(filename: string) {
    return `blobs/${filename}`;
  }

  private mediaRecordPath(id: string) {
    return `media/${id}.json`;
  }

  private async readRecord(id: string): Promise<PublicationRecord | null> {
    if (!ID_PATTERN.test(id)) return null;
    const value = await this.store.readJson<PublicationRecord>(this.recordPath(id));
    if (!value) return null;
    if (value.schemaVersion !== PUBLICATION_SCHEMA_VERSION || value.id !== id) {
      throw new PersistenceError("unavailable", "Stored publication is invalid.");
    }
    return value;
  }

  private mediaUrl(mediaId: string): string {
    const expires = Math.floor(this.clock().getTime() / 1000) + MEDIA_TTL_SECONDS;
    const signature = sign(this.config.mediaSigningSecret, `${mediaId}:${expires}`);
    return `${this.config.appOrigin}/api/media/${mediaId}?expires=${expires}&signature=${signature}`;
  }

  private links(publicToken: string, publicationId: string, expiresAt: string): PublishedSurpriseLinks {
    return {
      publicationId,
      shareUrl: `${this.config.appOrigin}/s/${publicToken}`,
      manageUrl: `${this.config.appOrigin}/create/manage/${publicationId}`,
      expiresAt,
    };
  }

  private async sanitizeScrapbook(
    content: SurpriseContent,
    publicationId: string,
  ): Promise<{
    content: StoredSurpriseContent;
    media: Array<{ record: MediaRecord; image: SanitizedImage }>;
  }> {
    if (content.memory.kind === "card") {
      return {
        content: { ...content, memory: { kind: "card", card: content.memory.card } },
        media: [],
      };
    }

    const sanitized: SanitizedImage[] = [];
    for (const slot of content.memory.scrapbook.slots) {
      sanitized.push(await sanitizeImage(slot.imageUrl ?? ""));
    }
    const media = sanitized.map((image, index) => {
      const mediaId = deriveToken(
        this.config.mediaSigningSecret,
        `media:${publicationId}:${index}`,
      );
      return {
        image,
        record: {
          schemaVersion: PUBLICATION_SCHEMA_VERSION,
          id: mediaId,
          publicationId,
          filename: `${mediaId}.${image.extension}`,
          mimeType: image.mimeType,
          width: image.width,
          height: image.height,
        } satisfies MediaRecord,
      };
    });
    const scrapbook: StoredSurpriseContent["memory"] = {
      kind: "scrapbook",
      scrapbook: {
        templateId: content.memory.scrapbook.templateId,
        description: content.memory.scrapbook.description,
        slots: content.memory.scrapbook.slots.map((slot, index) => ({
          id: slot.id,
          mediaId: media[index].record.id,
          transform: slot.transform,
        })),
      },
    };
    return {
      content: { ...content, memory: scrapbook },
      media,
    };
  }

  async publish(
    input: unknown,
    idempotencyKey: string,
    existingManagerToken?: string,
  ): Promise<PublishedResult> {
    if (!TOKEN_PATTERN.test(idempotencyKey)) {
      throw new PersistenceError("bad-request", "A valid idempotency key is required.");
    }
    const validated = validatePublicationInput(input);
    const payloadHash = sha256(stableStringify(validated.content));
    const publicToken = deriveToken(this.config.shareTokenPepper, `public:${idempotencyKey}`);
    const publicTokenHash = hashSecret(publicToken, this.config.shareTokenPepper);
    const publicationId = sha256(`${this.config.shareTokenPepper}:record:${idempotencyKey}`).slice(0, 32);
    const managerToken = validManagerToken(existingManagerToken)
      ? existingManagerToken
      : deriveToken(this.config.shareTokenPepper, `manager:${idempotencyKey}`);
    const managerHash = hashSecret(managerToken, this.config.shareTokenPepper);
    const existing = await this.readRecord(publicationId);
    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw new PersistenceError("conflict", "This publish operation was already used for different content.");
      }
      if (!safeEqual(existing.managerHash, managerHash)) {
        throw new PersistenceError("forbidden", "This publication belongs to another management session.");
      }
      await this.store.serialize(() => this.store.atomicWrite(
        this.publicPath(publicTokenHash),
        JSON.stringify({
          schemaVersion: PUBLICATION_SCHEMA_VERSION,
          publicationId,
        } satisfies PublicIndexRecord),
      ));
      return { ...this.links(publicToken, publicationId, existing.expiresAt), managerToken };
    }

    const prepared = await this.sanitizeScrapbook(validated.content, publicationId);
    return this.store.serialize(async () => {
      const raced = await this.readRecord(publicationId);
      if (raced) {
        if (raced.payloadHash !== payloadHash || !safeEqual(raced.managerHash, managerHash)) {
          throw new PersistenceError("conflict", "Conflicting publish operation.");
        }
        await this.store.atomicWrite(
          this.publicPath(publicTokenHash),
          JSON.stringify({
            schemaVersion: PUBLICATION_SCHEMA_VERSION,
            publicationId,
          } satisfies PublicIndexRecord),
        );
        return { ...this.links(publicToken, publicationId, raced.expiresAt), managerToken };
      }

      const createdAt = this.clock();
      const expiresAt = new Date(createdAt.getTime() + ONE_YEAR_MS).toISOString();
      const publication: PublicationRecord = {
        schemaVersion: PUBLICATION_SCHEMA_VERSION,
        id: publicationId,
        publicTokenHash,
        managerHash,
        payloadHash,
        status: "active",
        createdAt: createdAt.toISOString(),
        expiresAt,
        content: prepared.content,
      };

      for (const item of prepared.media) {
        await this.store.atomicWrite(this.mediaPath(item.record.filename), item.image.bytes);
        await this.store.atomicWrite(
          this.mediaRecordPath(item.record.id),
          JSON.stringify(item.record),
        );
      }
      await this.store.atomicWrite(this.recordPath(publicationId), JSON.stringify(publication));
      await this.store.atomicWrite(
        this.publicPath(publicTokenHash),
        JSON.stringify({
          schemaVersion: PUBLICATION_SCHEMA_VERSION,
          publicationId,
        } satisfies PublicIndexRecord),
      );
      return { ...this.links(publicToken, publicationId, expiresAt), managerToken };
    });
  }

  async load(publicToken: string): Promise<LoadedPublication> {
    if (!TOKEN_PATTERN.test(publicToken)) return { status: "not-found" };
    const tokenHash = hashSecret(publicToken, this.config.shareTokenPepper);
    const index = await this.store.readJson<PublicIndexRecord>(this.publicPath(tokenHash));
    if (!index || index.schemaVersion !== PUBLICATION_SCHEMA_VERSION) return { status: "not-found" };
    const record = await this.readRecord(index.publicationId);
    if (!record || !safeEqual(record.publicTokenHash, tokenHash)) return { status: "not-found" };
    if (activeStatus(record, this.clock()) === "closed") return { status: "closed" };

    let content: SurpriseContent;
    if (record.content.memory.kind === "card") {
      content = record.content;
    } else {
      const scrapbook: ScrapbookContent = {
        templateId: record.content.memory.scrapbook.templateId,
        description: record.content.memory.scrapbook.description,
        slots: record.content.memory.scrapbook.slots.map((slot) => ({
          id: slot.id,
          imageUrl: this.mediaUrl(slot.mediaId),
          transform: slot.transform,
        })),
      };
      content = { ...record.content, memory: { kind: "scrapbook", scrapbook } };
    }
    return {
      status: "active",
      expiresAt: record.expiresAt,
      surprise: { ...content, id: record.id, slug: publicToken },
    };
  }

  async getManaged(publicationId: string, managerToken?: string): Promise<ManagedPublication | null> {
    if (!validManagerToken(managerToken)) return null;
    const record = await this.readRecord(publicationId);
    if (!record) return null;
    const managerHash = hashSecret(managerToken, this.config.shareTokenPepper);
    if (!safeEqual(record.managerHash, managerHash)) return null;
    const expired = record.status === "active" && new Date(record.expiresAt).getTime() <= this.clock().getTime();
    return {
      id: record.id,
      status: expired ? "expired" : record.status,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    };
  }

  async revoke(publicationId: string, managerToken?: string): Promise<ManagedPublication> {
    if (!validManagerToken(managerToken)) {
      throw new PersistenceError("forbidden", "Management session is missing.");
    }
    return this.store.serialize(async () => {
      const record = await this.readRecord(publicationId);
      if (!record) throw new PersistenceError("not-found", "Publication was not found.");
      const managerHash = hashSecret(managerToken, this.config.shareTokenPepper);
      if (!safeEqual(record.managerHash, managerHash)) {
        throw new PersistenceError("forbidden", "Publication cannot be managed from this session.");
      }
      if (record.status === "active") {
        record.status = "revoked";
        record.revokedAt = this.clock().toISOString();
        await this.store.atomicWrite(this.recordPath(record.id), JSON.stringify(record));
      }
      return {
        id: record.id,
        status: record.status,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
      };
    });
  }

  async media(mediaId: string, expiresRaw: string, signature: string): Promise<MediaResult> {
    if (!MEDIA_ID_PATTERN.test(mediaId) || !TOKEN_PATTERN.test(signature) || !/^\d{10,12}$/.test(expiresRaw)) {
      throw new PersistenceError("forbidden", "Media signature is invalid.");
    }
    const expires = Number(expiresRaw);
    const nowSeconds = Math.floor(this.clock().getTime() / 1000);
    if (expires < nowSeconds || expires > nowSeconds + MEDIA_TTL_SECONDS) {
      throw new PersistenceError("forbidden", "Media signature has expired.");
    }
    const expected = sign(this.config.mediaSigningSecret, `${mediaId}:${expires}`);
    if (!safeEqual(expected, signature)) {
      throw new PersistenceError("forbidden", "Media signature is invalid.");
    }
    const media = await this.store.readJson<MediaRecord>(this.mediaRecordPath(mediaId));
    if (!media || media.schemaVersion !== PUBLICATION_SCHEMA_VERSION || media.id !== mediaId) {
      throw new PersistenceError("not-found", "Media was not found.");
    }
    const publication = await this.readRecord(media.publicationId);
    if (!publication || activeStatus(publication, this.clock()) !== "active") {
      throw new PersistenceError("not-found", "Media is unavailable.");
    }
    const bytes = await this.store.readBytes(this.mediaPath(media.filename));
    if (!bytes) throw new PersistenceError("not-found", "Media was not found.");
    return { bytes, mimeType: media.mimeType };
  }
}

const services = new Map<string, PublicationService>();

export function getPublicationService(config: PersistenceConfig): PublicationService {
  const key = `${config.dataDir}:${config.appOrigin}`;
  const existing = services.get(key);
  if (existing) return existing;
  const service = new PublicationService(config);
  services.set(key, service);
  return service;
}
