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

export type FindGiftConfig = {
  kind: "find-gift";
  sceneId: string;
  targetId: string;
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

export type Surprise = {
  id: string;
  slug: string;
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
