import {
  FIND_GIFT_TARGET_IDS,
  SCRAPBOOK_DESCRIPTION_MAX_LENGTH,
  SCRAPBOOK_TEMPLATE_SLOT_COUNTS,
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
    version: 2,
    draftId: "local-demo-draft",
    updatedAt,
    basics: {
      recipientName: "Mia",
      senderName: "Sunny",
      birthday: "0828",
      openingTemplateId: "warm-letter",
      openingTitle: "Mia，生日快乐！",
      openingPrompt: "Sunny 留了一段想对你说的话，还有一份小礼物，等你亲手打开。",
    },
    memoryKind: "card",
    unlock: {
      kind: "find-gift",
      targetId: "sofa-box",
    },
    card: {
      templateId: "coral-birthday",
      message: "愿新的一岁里，你还可以做喜欢的事，见喜欢的人，也别忘了照顾好自己。",
      signature: "Sunny",
    },
    scrapbook: {
      templateId: "one-photo",
      description: "一起收藏这一天",
      slots: [{ id: "memory-1", transform: { x: 0, y: 0, scale: 1 } }],
    },
    gift: {
      title: "一本属于你的年度照片书",
      description: "想看的时候再打开它；看完以后，也可以回来重看这份祝福。",
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
    add("basics", "请填写收礼人的称呼（1–20 个字）。");
  }
  if (senderName.length < 1 || senderName.length > 20) {
    add("basics", "请填写你的称呼（1–20 个字）。");
  }
  if (!isValidBirthday(draft.basics.birthday)) {
    add("basics", "请选一个有效的生日月日。");
  }

  if (
    draft.unlock.kind === "find-gift" &&
    !FIND_GIFT_TARGET_IDS.includes(draft.unlock.targetId)
  ) {
    add("unlock", "先选一个藏礼物的位置吧。");
  }

  if (draft.memoryKind === "card") {
    const messageLength = draft.card.message.trim().length;
    if (!draft.card.templateId.trim()) {
      add("memory", "先选一张贺卡样式吧。");
    }
    if (messageLength < 10 || messageLength > 200) {
      add("memory", "想说的话请写在 10–200 个字之间。");
    }
    if (!draft.card.signature.trim()) {
      add("memory", "别忘了留下署名。");
    }
  } else {
    const expectedSlots = SCRAPBOOK_TEMPLATE_SLOT_COUNTS[draft.scrapbook.templateId];
    if (!expectedSlots) {
      add("memory", "先选一个手帐版式吧。");
    } else if (draft.scrapbook.slots.length !== expectedSlots) {
      add("memory", `这个版式需要放入 ${expectedSlots} 张照片。`);
    }
    if (draft.scrapbook.slots.some((slot) => !slot.imageUrl?.trim())) {
      add("memory", `请为这个版式放入 ${expectedSlots ?? 1} 张照片。`);
    }
    if (draft.scrapbook.description.trim().length > SCRAPBOOK_DESCRIPTION_MAX_LENGTH) {
      add("memory", `这一句话不要超过 ${SCRAPBOOK_DESCRIPTION_MAX_LENGTH} 个字。`);
    }
  }

  const giftTitleLength = draft.gift.title.trim().length;
  if (giftTitleLength < 2 || giftTitleLength > 40) {
    add("gift", "礼物名称请写在 2–40 个字之间。");
  }
  if (draft.gift.description.trim().length > 120) {
    add("gift", "补充的话不要超过 120 个字。");
  }
  if (!isHttpsUrl(draft.gift.externalUrl.trim())) {
    add("gift", "请填写有效的 HTTPS 礼物链接。");
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
    case "none":
      return { kind: "none" };
    case "rps":
      return { kind: "rps" };
    case "find-gift":
      return {
        kind: "find-gift",
        sceneId: "cozy-room",
        targetId: draft.unlock.targetId,
      };
    case "blow-candles":
      return { kind: "blow-candles" };
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
  const memory = draft.memoryKind === "card"
    ? {
        kind: "card" as const,
        card: {
          templateId: draft.card.templateId,
          message: draft.card.message.trim(),
          signature: draft.card.signature.trim(),
        },
      }
    : {
        kind: "scrapbook" as const,
        scrapbook: {
          templateId: draft.scrapbook.templateId,
          description: draft.scrapbook.description.trim(),
          slots: draft.scrapbook.slots.map((slot) => ({
            ...slot,
          })),
        },
      };
  const preview: SurprisePreview = {
    mode: "preview",
    draftId: draft.draftId,
    recipient: { displayName: recipientName },
    sender: { displayName: senderName },
    birthday: draft.basics.birthday,
    opening: {
      templateId: "warm-letter",
      title: `${recipientName}，生日快乐！`,
      prompt: draft.unlock.kind === "none"
        ? `${senderName} 留了一段想对你说的话，还有一份小礼物。`
        : `${senderName} 留了一段想对你说的话，还有一份小礼物，等你亲手打开。`,
    },
    unlock: toUnlockConfig(draft),
    memory,
    gift: {
      title: draft.gift.title.trim(),
      description: draft.gift.description.trim(),
      externalUrl: draft.gift.externalUrl.trim(),
    },
    share: {
      title: `${recipientName} 的生日惊喜`,
      text: `${senderName} 准备了一份生日惊喜，想和你分享。`,
    },
  };

  return { ok: true, preview };
}
