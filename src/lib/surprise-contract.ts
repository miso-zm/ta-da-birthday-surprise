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
  "cabinet-gift",
  "sofa-gift",
  "plant-gift",
] as const;

export type FindGiftTargetId = (typeof FIND_GIFT_TARGET_IDS)[number];

export type FindGiftConfig = {
  kind: "find-gift";
  sceneId: string;
  targetId: FindGiftTargetId;
};

export type BirthdayPasswordConfig = {
  kind: "birthday-password";
  answer: string;
};

export type UnlockConfig =
  | RockPaperScissorsConfig
  | FindGiftConfig
  | BirthdayPasswordConfig;

export type UnlockResult = {
  kind: UnlockConfig["kind"];
  attempts: number;
  usedFallback: boolean;
};

export type CardContent = {
  templateId: string;
  message: string;
  signature: string;
};

export type ScrapbookSlot = {
  id: string;
  caption: string;
  imageUrl?: string;
};

export type ScrapbookContent = {
  templateId: string;
  title: string;
  slots: ScrapbookSlot[];
};

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
  card: CardContent;
  scrapbook: ScrapbookContent;
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
  | "card"
  | "scrapbook"
  | "gift"
  | "publish";

export const SENDER_STEPS: SenderStep[] = [
  "basics",
  "unlock",
  "card",
  "scrapbook",
  "gift",
  "publish",
];

export type SenderUnlockDraft =
  | RockPaperScissorsConfig
  | {
      kind: "find-gift";
      targetId: FindGiftTargetId;
    }
  | {
      kind: "birthday-password";
    };

export type SenderDraft = {
  version: 1;
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
  | "card"
  | "scrapbook"
  | "gift"
  | "share";

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
