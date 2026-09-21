import type { Surprise } from "@/lib/surprise-contract";

export const demoSurprise: Surprise = {
  id: "demo-mia-2026",
  slug: "mia-birthday",
  recipient: { displayName: "Mia" },
  sender: { displayName: "Miso" },
  birthday: "0828",
  opening: {
    templateId: "warm-letter",
    title: "Mia，生日快乐！",
    prompt: "Miso 留了一段想对你说的话，还有一份小礼物，等你亲手打开。",
  },
  unlock: {
    kind: "find-gift",
    sceneId: "cozy-room",
    targetId: "sofa-box",
  },
  memory: {
    kind: "card",
    card: {
      templateId: "coral-birthday",
      message: "愿新的一岁里，你还可以做喜欢的事，见喜欢的人，也别忘了照顾好自己。",
      signature: "Miso",
    },
  },
  gift: {
    kind: "link",
    title: "一本属于你的年度照片书",
    description: "想看的时候再打开它；看完以后，也可以回来重看这份祝福。",
    externalUrl: "https://3.cn/-SafeGift123",
  },
  share: {
    title: "Mia 的生日惊喜",
    text: "Miso 准备了一份生日惊喜，想和你分享。",
  },
};

export function getDemoSurprise(slug: string): Surprise | null {
  return slug === demoSurprise.slug ? demoSurprise : null;
}
