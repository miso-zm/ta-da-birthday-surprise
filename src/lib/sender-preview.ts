import {
  FIND_GIFT_TARGET_IDS,
  SENDER_STEPS,
  isHttpsUrl,
  type SenderDraft,
  type SenderPreviewResult,
  type SenderStep,
  type SenderValidationErrors,
  type SurprisePreview,
  type UnlockConfig,
} from "./surprise-contract";

export function createDefaultSenderDraft(
  updatedAt = new Date().toISOString(),
): SenderDraft {
  return {
    version: 1,
    draftId: "local-demo-draft",
    updatedAt,
    basics: {
      recipientName: "Mia",
      senderName: "Sunny",
      birthday: "0828",
      openingTemplateId: "warm-letter",
      openingTitle: "Mia，今天有一份惊喜给你",
      openingPrompt: "Sunny 藏了一段祝福，还有一份需要亲手解锁的礼物。",
    },
    unlock: {
      kind: "find-gift",
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
  };
}

export function isValidBirthday(value: string): boolean {
  if (!/^\d{4}$/.test(value)) {
    return false;
  }

  const month = Number(value.slice(0, 2));
  const day = Number(value.slice(2));
  const date = new Date(2000, month - 1, day);

  return date.getMonth() === month - 1 && date.getDate() === day;
}

export function validateSenderDraft(
  draft: SenderDraft,
): SenderValidationErrors {
  const errors: SenderValidationErrors = {};
  const add = (step: SenderStep, message: string) => {
    errors[step] = [...(errors[step] ?? []), message];
  };

  const recipientName = draft.basics.recipientName.trim();
  const senderName = draft.basics.senderName.trim();

  if (recipientName.length < 1 || recipientName.length > 20) {
    add("basics", "收件人称呼需要 1–20 个字。");
  }
  if (senderName.length < 1 || senderName.length > 20) {
    add("basics", "送礼人称呼需要 1–20 个字。");
  }
  if (!isValidBirthday(draft.basics.birthday)) {
    add("basics", "生日需要是有效的四位月日。");
  }
  if (!draft.basics.openingTemplateId.trim()) {
    add("basics", "请选择 Opening 模板。");
  }
  if (!draft.basics.openingTitle.trim() || !draft.basics.openingPrompt.trim()) {
    add("basics", "请补全 Opening 标题和引导文案。");
  }

  if (
    draft.unlock.kind === "find-gift" &&
    !FIND_GIFT_TARGET_IDS.includes(draft.unlock.targetId)
  ) {
    add("unlock", "请选择有效的藏礼物位置。");
  }

  const messageLength = draft.card.message.trim().length;
  if (!draft.card.templateId.trim()) {
    add("card", "请选择生日卡模板。");
  }
  if (messageLength < 10 || messageLength > 240) {
    add("card", "生日祝福需要 10–240 个字。");
  }
  if (!draft.card.signature.trim()) {
    add("card", "请填写生日卡署名。");
  }

  if (!draft.scrapbook.templateId.trim() || !draft.scrapbook.title.trim()) {
    add("scrapbook", "请选择 Scrapbook 模板并填写标题。");
  }
  if (draft.scrapbook.slots.length < 1 || draft.scrapbook.slots.length > 3) {
    add("scrapbook", "Scrapbook 需要保留 1–3 个照片位。");
  }
  if (draft.scrapbook.slots.some((slot) => slot.caption.trim().length > 30)) {
    add("scrapbook", "每张照片的说明不能超过 30 个字。");
  }

  const giftTitleLength = draft.gift.title.trim().length;
  if (giftTitleLength < 2 || giftTitleLength > 40) {
    add("gift", "礼物名称需要 2–40 个字。");
  }
  if (draft.gift.description.trim().length > 120) {
    add("gift", "礼物描述不能超过 120 个字。");
  }
  if (!isHttpsUrl(draft.gift.externalUrl.trim())) {
    add("gift", "礼物链接必须是有效的 HTTPS 地址。");
  }

  return errors;
}

export function getFirstIncompleteSenderStep(
  draft: SenderDraft,
): SenderStep {
  const errors = validateSenderDraft(draft);
  return SENDER_STEPS.find((step) => errors[step]?.length) ?? "publish";
}

function toUnlockConfig(draft: SenderDraft): UnlockConfig {
  switch (draft.unlock.kind) {
    case "rps":
      return { kind: "rps" };
    case "find-gift":
      return {
        kind: "find-gift",
        sceneId: "cozy-room",
        targetId: draft.unlock.targetId,
      };
    case "birthday-password":
      return {
        kind: "birthday-password",
        answer: draft.basics.birthday,
      };
  }
}

export function senderDraftToPreview(
  draft: SenderDraft,
): SenderPreviewResult {
  const errors = validateSenderDraft(draft);
  const firstIncompleteStep = getFirstIncompleteSenderStep(draft);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, firstIncompleteStep };
  }

  const recipientName = draft.basics.recipientName.trim();
  const senderName = draft.basics.senderName.trim();
  const preview: SurprisePreview = {
    mode: "preview",
    draftId: draft.draftId,
    recipient: { displayName: recipientName },
    sender: { displayName: senderName },
    birthday: draft.basics.birthday,
    opening: {
      templateId: draft.basics.openingTemplateId,
      title: draft.basics.openingTitle.trim(),
      prompt: draft.basics.openingPrompt.trim(),
    },
    unlock: toUnlockConfig(draft),
    card: {
      templateId: draft.card.templateId,
      message: draft.card.message.trim(),
      signature: draft.card.signature.trim(),
    },
    scrapbook: {
      templateId: draft.scrapbook.templateId,
      title: draft.scrapbook.title.trim(),
      slots: draft.scrapbook.slots.map((slot) => ({
        ...slot,
        caption: slot.caption.trim(),
      })),
    },
    gift: {
      title: draft.gift.title.trim(),
      description: draft.gift.description.trim(),
      externalUrl: draft.gift.externalUrl.trim(),
    },
    share: {
      title: `给 ${recipientName} 的生日惊喜`,
      text: `${senderName} 为 ${recipientName} 准备了一份生日惊喜。`,
    },
  };

  return { ok: true, preview };
}
