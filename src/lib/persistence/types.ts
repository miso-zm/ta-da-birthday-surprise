import type {
  CardContent,
  GiftContent,
  OpeningContent,
  Person,
  ScrapbookPhotoTransform,
  ShareContent,
  Surprise,
  SurpriseContent,
  UnlockConfig,
} from "../surprise-contract";

export const PUBLICATION_SCHEMA_VERSION = 1;

export type StoredScrapbookSlot = {
  id: string;
  mediaId: string;
  transform: ScrapbookPhotoTransform;
};

export type StoredSurpriseContent = {
  recipient: Person;
  sender: Person;
  birthday: string;
  opening: OpeningContent;
  unlock: UnlockConfig;
  memory:
    | { kind: "card"; card: CardContent }
    | {
        kind: "scrapbook";
        scrapbook: {
          templateId: "one-photo" | "two-photo" | "three-photo";
          description: string;
          slots: StoredScrapbookSlot[];
        };
      };
  gift: GiftContent;
  share: ShareContent;
};

export type PublicationStatus = "active" | "revoked" | "deleted";

export type PublicationRecord = {
  schemaVersion: typeof PUBLICATION_SCHEMA_VERSION;
  id: string;
  publicTokenHash: string;
  managerHash: string;
  payloadHash: string;
  status: PublicationStatus;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  deletedAt?: string;
  content: StoredSurpriseContent;
};

export type PublicIndexRecord = {
  schemaVersion: typeof PUBLICATION_SCHEMA_VERSION;
  publicationId: string;
};

export type MediaRecord = {
  schemaVersion: typeof PUBLICATION_SCHEMA_VERSION;
  id: string;
  publicationId: string;
  filename: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
};

export type LoadedPublication =
  | { status: "active"; surprise: Surprise; expiresAt: string }
  | { status: "closed" }
  | { status: "not-found" };

export type ManagedPublication = {
  id: string;
  status: PublicationStatus | "expired";
  createdAt: string;
  expiresAt: string;
};

export type ValidatedPublication = {
  content: SurpriseContent;
  scrapbookImages: Array<{ slotId: string; dataUrl: string }>;
};
