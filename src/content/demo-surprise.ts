import type { Surprise } from "@/lib/surprise-contract";

export const demoSurprise: Surprise = {
  id: "demo-mia-2026",
  slug: "mia-birthday",
  recipient: { displayName: "Mia" },
  sender: { displayName: "Sunny" },
  birthday: "0828",
  opening: {
    templateId: "warm-letter",
    title: "Mia，今天有一份惊喜给你",
    prompt: "Sunny 藏了一段祝福，还有一份需要亲手解锁的礼物。",
  },
  unlock: {
    kind: "find-gift",
    sceneId: "cozy-room",
    targetId: "cabinet-gift",
  },
  card: {
    templateId: "coral-birthday",
    message: "希望新的一岁继续做喜欢的事，见喜欢的人，也记得好好照顾自己。",
    signature: "Sunny",
  },
  scrapbook: {
    templateId: "three-memories",
    title: "我们的快乐碎片",
    slots: [
      { id: "memory-1", caption: "一起庆祝的日子" },
      { id: "memory-2", caption: "普通但很快乐的一天" },
      { id: "memory-3", caption: "以后还要继续收集" },
    ],
  },
  gift: {
    title: "一本属于你的年度照片书",
    description: "礼物会在新页面中打开，你可以稍后再回来继续看祝福。",
    externalUrl: "https://example.com",
  },
  share: {
    title: "给 Mia 的生日惊喜",
    text: "这份生日惊喜也想和你分享。",
  },
};

export function getDemoSurprise(slug: string): Surprise | null {
  return slug === demoSurprise.slug ? demoSurprise : null;
}
