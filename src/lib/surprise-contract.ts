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

export type GiftContent = {
  title: string;
  description: string;
  externalUrl: string;
};

export type ShareContent = {
  title: string;
  text: string;
};

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export type SurpriseContent = {
  recipient: Person;
  sender: Person;
  birthday: string;
  opening: OpeningContent;
  unlock: UnlockConfig;
  memory: MemoryContent;
  gift: GiftContent;
  share: ShareContent;
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
    birthday: string;
    openingTemplateId: string;
    openingTitle: string;
    openingPrompt: string;
  };
  memoryKind: MemoryContent["kind"];
  unlock: SenderUnlockDraft;
  card: CardContent;
  scrapbook: ScrapbookContent;
  gift: GiftContent;
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

export type ReceiverStep =
  | "opening"
  | "unlock"
  | "memory"
  | "gift"
  | "share";

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
