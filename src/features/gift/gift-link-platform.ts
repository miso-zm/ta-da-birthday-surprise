import { getPublicGiftLink } from "@/lib/gift-link-policy";

export type GiftLinkPlatformId = "taobao" | "jd" | "generic";

export type GiftLinkPlatform = {
  id: GiftLinkPlatformId;
  name: string;
  domain: string;
  url: string;
  kind: "gift";
};

export function getGiftLinkPlatform(rawUrl: string): GiftLinkPlatform | null {
  const link = getPublicGiftLink(rawUrl);
  return link ? { ...link } : null;
}
