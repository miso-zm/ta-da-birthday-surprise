export type Person = {
  displayName: string;
};

export type OpeningContent = {
  templateId: string;
  title: string;
  prompt: string;
};

export type RockPaperScissorsConfig = {
  kind: "rps";
};

export const FIND_GIFT_TARGET_IDS = [
  "sofa-box",
  "plant-box",
  "rug-box",
] as const;

export type FindGiftTargetId = (typeof FIND_GIFT_TARGET_IDS)[number];

export type FindGiftConfig = {
  kind: "find-gift";
  sceneId: string;
  targetId: FindGiftTargetId;
};

export type BlowCandlesConfig = {
  kind: "blow-candles";
};

export type NoUnlockConfig = {
  kind: "none";
};

export type UnlockConfig =
  | NoUnlockConfig
  | RockPaperScissorsConfig
  | FindGiftConfig
  | BlowCandlesConfig;

export type PlayableUnlockConfig = Exclude<UnlockConfig, NoUnlockConfig>;

export type UnlockResult = {
  kind: PlayableUnlockConfig["kind"];
  attempts: number;
  usedFallback: boolean;
};

export type CardContent = {
  templateId: string;
  message: string;
  signature: string;
};

export const SCRAPBOOK_TEMPLATE_SLOT_COUNTS = {
  "one-photo": 1,
  "two-photo": 2,
  "three-photo": 3,
} as const;

export const SCRAPBOOK_DESCRIPTION_MAX_LENGTH = 34;

export type ScrapbookTemplateId = keyof typeof SCRAPBOOK_TEMPLATE_SLOT_COUNTS;

export type ScrapbookPhotoTransform = {
  x: number;
  y: number;
  scale: number;
};

export type ScrapbookSlot = {
  id: string;
  imageUrl?: string;
  transform: ScrapbookPhotoTransform;
};

export type ScrapbookContent = {
  templateId: ScrapbookTemplateId;
  description: string;
  slots: ScrapbookSlot[];
};

export type MemoryContent =
  | { kind: "card"; card: CardContent }
  | { kind: "scrapbook"; scrapbook: ScrapbookContent };

export type GiftKind = "none" | "link";

export type GiftContent = {
  kind: GiftKind;
  /**
   * Retained only to keep existing local drafts readable during the Sender
   * transition. The new Gift UI and Receiver reveal do not display them.
   */
  title: string;
  description: string;
  externalUrl: string;
};

export type ShareContent = {
  title: string;
  text: string;
};

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export const PORTRAIT_TEMPLATE_IDS = ["balloon", "blue"] as const;

export type PortraitTemplateId = (typeof PORTRAIT_TEMPLATE_IDS)[number];

export type PortraitTransform = {
  centerX: number;
  centerY: number;
  width: number;
  rotation: number;
};

export type PortraitPosterContent = {
  templateId: PortraitTemplateId;
  imageUrl: string;
};

export type SenderPortraitDraft = {
  templateId: PortraitTemplateId;
  stickerImageUrl: string;
  posterImageUrl: string;
  transform: PortraitTransform;
};

export type SurpriseContent = {
  recipient: Person;
  sender: Person;
  birthday?: string;
  opening: OpeningContent;
  unlock: UnlockConfig;
  memory: MemoryContent;
  gift: GiftContent;
  share: ShareContent;
  portrait?: PortraitPosterContent;
};

export type Surprise = SurpriseContent & {
  id: string;
  slug: string;
};

export type SurprisePreview = SurpriseContent & {
  mode: "preview";
  draftId: string;
};

export type SenderStep =
  | "basics"
  | "unlock"
  | "memory"
  | "gift"
  | "publish";

export const SENDER_STEPS: SenderStep[] = [
  "basics",
  "unlock",
  "memory",
  "gift",
  "publish",
];

export type SenderUnlockDraft =
  | NoUnlockConfig
  | RockPaperScissorsConfig
  | {
      kind: "find-gift";
      targetId: FindGiftTargetId;
    }
  | {
      kind: "blow-candles";
    };

export type SenderDraft = {
  version: 2;
  draftId: string;
  updatedAt: string;
  basics: {
    recipientName: string;
    senderName: string;
    birthday?: string;
    openingTemplateId: string;
    openingTitle: string;
    openingPrompt: string;
  };
  memoryKind: MemoryContent["kind"];
  unlock: SenderUnlockDraft;
  card: CardContent;
  scrapbook: ScrapbookContent;
  gift: GiftContent;
  portrait?: SenderPortraitDraft;
  /** True only after the sender explicitly finishes or skips the portrait page. */
  portraitChoiceMade?: boolean;
};

export type SenderValidationErrors = Partial<
  Record<SenderStep, string[]>
>;

export type SenderPreviewResult =
  | {
      ok: true;
      preview: SurprisePreview;
    }
  | {
      ok: false;
      errors: SenderValidationErrors;
      firstIncompleteStep: SenderStep;
    };

export type PublishedSurpriseLinks = {
  publicationId: string;
  shareUrl: string;
  manageUrl: string;
  expiresAt: string;
};

export type ReceiverStep =
  | "opening"
  | "unlock"
  | "memory"
  | "gift"
  | "share";

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !/[\u0000-\u001f\u007f]/.test(value)
    );
  } catch {
    return false;
  }
}

export function hasGiftLink(gift: GiftContent): boolean {
  return gift.kind === "link" && isHttpsUrl(gift.externalUrl);
}
