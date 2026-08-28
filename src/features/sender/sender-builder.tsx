"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  SENDER_STEPS,
  type FindGiftTargetId,
  type SenderDraft,
  type SenderStep,
  type SurprisePreview,
} from "../../lib/surprise-contract";
import {
  createDefaultSenderDraft,
  getFirstIncompleteSenderStep,
  senderDraftToPreview,
  validateSenderDraft,
} from "../../lib/sender-preview";
import {
  clearSenderDraft,
  getBrowserDraftStorage,
  loadSenderDraft,
  saveSenderDraft,
} from "../../lib/sender-draft-storage";

import styles from "./sender-builder.module.css";

const STEP_META: Record<SenderStep, { eyebrow: string; title: string; intro: string }> = {
  basics: {
    eyebrow: "先认识一下",
    title: "这份惊喜是给谁的？",
    intro: "填好双方称呼和生日，Tada 会帮你把开场准备好。",
  },
  unlock: {
    eyebrow: "加一点小游戏",
    title: "怎么解锁惊喜？",
    intro: "选择一种轻松的玩法。收礼人不用下载任何东西。",
  },
  card: {
    eyebrow: "写一张生日卡",
    title: "把想说的话留下来",
    intro: "先选卡片样式，再写下只属于你们的祝福。",
  },
  scrapbook: {
    eyebrow: "收集快乐碎片",
    title: "做一本小小回忆册",
    intro: "照片会按上传顺序放进固定版式，不需要自己排版。",
  },
  gift: {
    eyebrow: "还有最后一份礼物",
    title: "礼物藏在哪里？",
    intro: "填写一个安全的 HTTPS 链接，拆开后再由收礼人主动打开。",
  },
  publish: {
    eyebrow: "准备好啦",
    title: "先看看完整惊喜",
    intro: "这是本地预览，不会生成假的公开分享链接。",
  },
};

const OPENING_TEMPLATES = [
  { id: "warm-letter", name: "暖暖来信", description: "奶油信纸与珊瑚点缀" },
  { id: "birthday-window", name: "生日窗口", description: "像打开一扇惊喜小窗" },
] as const;

const CARD_TEMPLATES = [
  { id: "coral-birthday", name: "珊瑚生日卡", description: "热闹、温暖、适合好友" },
  { id: "cream-wishes", name: "奶油小花卡", description: "安静、柔软、留白更多" },
] as const;

const SCRAPBOOK_TEMPLATES = [
  { id: "three-memories", name: "三段回忆", description: "三张照片，像翻开一本相册" },
  { id: "postcard-collage", name: "今天与那天", description: "一张主照片搭配两张小照片" },
] as const;

const GIFT_TARGETS: Array<{
  id: FindGiftTargetId;
  name: string;
  description: string;
}> = [
  { id: "cabinet-gift", name: "小柜子", description: "藏得稳稳的，适合默认演示" },
  { id: "sofa-gift", name: "沙发靠垫", description: "近在眼前，但不容易发现" },
  { id: "plant-gift", name: "花盆旁边", description: "给房间留一点自然线索" },
];

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1200;

type SaveState = "idle" | "saving" | "saved" | "error";

export type SenderBuilderProps = {
  initialDraft?: SenderDraft;
  onDraftChange?: (draft: SenderDraft) => void;
  onPreview: (preview: SurprisePreview, draft: SenderDraft) => void;
  onExit?: () => void;
};

function stepIndex(step: SenderStep): number {
  return SENDER_STEPS.indexOf(step);
}

function formatBirthdayPart(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(month: number): number {
  return new Date(2000, month, 0).getDate();
}

function formatSavedTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("请选择图片文件。"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("单张原始照片请不要超过 12MB。"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        try {
          const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("当前浏览器暂时无法处理照片。"));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        } catch {
          reject(new Error("这张照片太大或格式特殊，请换一张试试。"));
        }
      };
      image.onerror = () => reject(new Error("这张照片暂时无法读取，请换一张试试。"));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("这张照片暂时无法读取，请换一张试试。"));
    reader.readAsDataURL(file);
  });
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </label>
  );
}

function ChoiceCard({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.choiceCard} ${selected ? styles.choiceCardSelected : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className={styles.choiceMark} aria-hidden="true">
        {selected ? "✓" : ""}
      </span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}

function ErrorPanel({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className={styles.errorPanel} role="alert" aria-live="assertive">
      <strong>这一页还有一点需要补全</strong>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

function TadaCompanion({ message }: { message: string }) {
  return (
    <div className={styles.companion} aria-label={`Tada 提示：${message}`}>
      <span className={styles.tadaFace} aria-hidden="true">
        <i />
        <b />
      </span>
      <p>{message}</p>
    </div>
  );
}

export function SenderBuilder({
  initialDraft,
  onDraftChange,
  onPreview,
  onExit,
}: SenderBuilderProps) {
  const [draft, setDraft] = useState<SenderDraft>(() =>
    initialDraft ?? createDefaultSenderDraft(),
  );
  const [currentStep, setCurrentStep] = useState<SenderStep>("basics");
  const [screen, setScreen] = useState<"loading" | "recover" | "edit">("loading");
  const [recoverableDraft, setRecoverableDraft] = useState<SenderDraft | null>(null);
  const [loadMessage, setLoadMessage] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollArea = useRef<HTMLDivElement | null>(null);
  const stepHeading = useRef<HTMLHeadingElement | null>(null);
  const onDraftChangeRef = useRef(onDraftChange);
  const initialized = useRef(false);

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);

  useEffect(() => {
    if (initialDraft) {
      setDraft(initialDraft);
      setCurrentStep(getFirstIncompleteSenderStep(initialDraft));
      setScreen("edit");
      initialized.current = true;
      return;
    }

    const storage = getBrowserDraftStorage();
    if (!storage) {
      setLoadMessage("当前浏览器无法保存草稿，但你仍然可以继续完成预览。");
      setScreen("edit");
      initialized.current = true;
      return;
    }

    const result = loadSenderDraft(storage);
    if (result.status === "ready") {
      setRecoverableDraft(result.draft);
      setScreen("recover");
    } else {
      if (result.status === "invalid") setLoadMessage(result.reason);
      setDraft(createDefaultSenderDraft());
      setScreen("edit");
      initialized.current = true;
    }
  }, [initialDraft]);

  useEffect(() => {
    if (!initialized.current || screen !== "edit") return;

    setSaveState("saving");
    setSaveError("");
    onDraftChangeRef.current?.(draft);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const storage = getBrowserDraftStorage();
      if (!storage) {
        setSaveState("error");
        setSaveError("当前浏览器无法保存草稿，但不影响继续预览。");
        return;
      }
      const result = saveSenderDraft(storage, draft);
      setSaveState(result.ok ? "saved" : "error");
      setSaveError(result.ok ? "" : result.reason);
    }, 250);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, screen]);

  useEffect(() => {
    scrollArea.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => stepHeading.current?.focus());
  }, [currentStep]);

  const validationErrors = useMemo(() => validateSenderDraft(draft), [draft]);
  const currentErrors = showErrors ? (validationErrors[currentStep] ?? []) : [];
  const currentIndex = stepIndex(currentStep);
  const rawMonth = Number(draft.basics.birthday.slice(0, 2));
  const month = rawMonth >= 1 && rawMonth <= 12 ? rawMonth : 0;
  const rawDay = Number(draft.basics.birthday.slice(2));
  const day =
    month > 0 && rawDay >= 1 && rawDay <= daysInMonth(month) ? rawDay : 0;

  function replaceDraft(updater: (previous: SenderDraft) => SenderDraft) {
    setDraft((previous) => ({
      ...updater(previous),
      updatedAt: new Date().toISOString(),
    }));
    setShowErrors(false);
  }

  function resumeDraft() {
    if (!recoverableDraft) return;
    setDraft(recoverableDraft);
    setCurrentStep(getFirstIncompleteSenderStep(recoverableDraft));
    setScreen("edit");
    setSaveState("saved");
    initialized.current = true;
  }

  function startFresh() {
    const storage = getBrowserDraftStorage();
    if (storage) clearSenderDraft(storage);
    setDraft(createDefaultSenderDraft());
    setCurrentStep("basics");
    setRecoverableDraft(null);
    setScreen("edit");
    setSaveState("idle");
    initialized.current = true;
  }

  function goBack() {
    setShowErrors(false);
    setPhotoError("");
    if (currentIndex === 0) {
      onExit?.();
      return;
    }
    setCurrentStep(SENDER_STEPS[currentIndex - 1]);
  }

  function goNext() {
    const errors = validationErrors[currentStep] ?? [];
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (currentIndex < SENDER_STEPS.length - 1) {
      setCurrentStep(SENDER_STEPS[currentIndex + 1]);
    }
  }

  function openPreview() {
    const result = senderDraftToPreview(draft);
    if (!result.ok) {
      setCurrentStep(result.firstIncompleteStep);
      setShowErrors(true);
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    onDraftChangeRef.current?.(draft);
    const storage = getBrowserDraftStorage();
    if (storage) {
      const saveResult = saveSenderDraft(storage, draft);
      setSaveState(saveResult.ok ? "saved" : "error");
      setSaveError(saveResult.ok ? "" : saveResult.reason);
    } else {
      setSaveState("error");
      setSaveError("当前浏览器无法保存草稿，但不影响继续预览。");
    }
    onPreview(result.preview, draft);
  }

  function updateBirthday(nextMonth: number, nextDay: number) {
    const safeDay = Math.min(nextDay, daysInMonth(nextMonth));
    replaceDraft((previous) => ({
      ...previous,
      basics: {
        ...previous.basics,
        birthday: `${formatBirthdayPart(nextMonth)}${formatBirthdayPart(safeDay)}`,
      },
    }));
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setPhotoError("");

    try {
      const images = await Promise.all(files.slice(0, 3).map(readImageFile));
      replaceDraft((previous) => {
        const slots = previous.scrapbook.slots.map((slot) => ({ ...slot }));
        for (const imageUrl of images) {
          let index = slots.findIndex((slot) => !slot.imageUrl);
          if (index === -1 && slots.length < 3) {
            slots.push({
              id: `memory-${slots.length + 1}`,
              caption: "",
            });
            index = slots.length - 1;
          }
          if (index === -1) break;
          slots[index].imageUrl = imageUrl;
        }
        return {
          ...previous,
          scrapbook: { ...previous.scrapbook, slots },
        };
      });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "照片暂时无法读取。");
    }
  }

  async function replacePhoto(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError("");
    try {
      const imageUrl = await readImageFile(file);
      replaceDraft((previous) => ({
        ...previous,
        scrapbook: {
          ...previous.scrapbook,
          slots: previous.scrapbook.slots.map((slot, slotIndex) =>
            slotIndex === index ? { ...slot, imageUrl } : slot,
          ),
        },
      }));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "照片暂时无法读取。");
    }
  }

  function removePhoto(index: number) {
    replaceDraft((previous) => ({
      ...previous,
      scrapbook: {
        ...previous.scrapbook,
        slots: previous.scrapbook.slots.map((slot, slotIndex) =>
          slotIndex === index ? { ...slot, imageUrl: undefined } : slot,
        ),
      },
    }));
  }

  if (screen === "loading") {
    return (
      <main className={styles.centeredScreen} aria-busy="true">
        <div className={styles.loadingBlock}>
          <div className={styles.loadingMark} aria-hidden="true" />
          <p>正在整理你的惊喜…</p>
        </div>
      </main>
    );
  }

  if (screen === "recover" && recoverableDraft) {
    const incomplete = getFirstIncompleteSenderStep(recoverableDraft);
    return (
      <main className={styles.centeredScreen}>
        <section className={styles.recoveryCard} aria-labelledby="recovery-title">
          <TadaCompanion message="我替你把上次的心意收好啦。" />
          <p className={styles.eyebrow}>发现一份未完成的惊喜</p>
          <h1 id="recovery-title">继续上次的制作吗？</h1>
          <p className={styles.recoveryCopy}>
            给 <strong>{recoverableDraft.basics.recipientName || "朋友"}</strong> 的惊喜，
            上次保存于 {formatSavedTime(recoverableDraft.updatedAt)}。
          </p>
          <p className={styles.progressNote}>
            将从第 {stepIndex(incomplete) + 1} 步继续
          </p>
          <button type="button" className={styles.primaryButton} onClick={resumeDraft}>
            继续编辑
          </button>
          <button type="button" className={styles.textButton} onClick={startFresh}>
            不用了，重新开始
          </button>
        </section>
      </main>
    );
  }

  const meta = STEP_META[currentStep];

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={goBack}>
          {currentIndex === 0 ? "退出" : "返回"}
        </button>
        <div className={styles.progress} aria-label={`第 ${currentIndex + 1} 步，共 6 步`}>
          <span>{currentIndex + 1}/6</span>
          <div className={styles.progressTrack} aria-hidden="true">
            <i style={{ width: `${((currentIndex + 1) / 6) * 100}%` }} />
          </div>
        </div>
        <span className={styles.saveStatus} role="status" aria-live="polite">
          {saveState === "saving"
            ? "保存中"
            : saveState === "saved"
              ? "已保存"
              : saveState === "error"
                ? "暂未保存"
                : "本地草稿"}
        </span>
      </header>

      <div className={styles.scrollArea} ref={scrollArea}>
        <section className={styles.stepIntro}>
          <p className={styles.eyebrow}>{meta.eyebrow}</p>
          <h1 ref={stepHeading} tabIndex={-1}>{meta.title}</h1>
          <p>{meta.intro}</p>
        </section>

        {loadMessage ? (
          <p className={styles.notice} role="status">
            {loadMessage}
          </p>
        ) : null}

        {saveError ? (
          <p className={styles.notice} role="status">
            {saveError}
          </p>
        ) : null}

        <ErrorPanel errors={currentErrors} />

        <section className={styles.formSection}>
          {currentStep === "basics" ? (
            <>
              <div className={styles.twoColumns}>
                <Field label="收件人称呼">
                  <input
                    value={draft.basics.recipientName}
                    maxLength={20}
                    autoComplete="off"
                    onChange={(event) => {
                      const nextName = event.target.value;
                      replaceDraft((previous) => {
                        const oldGenerated = `${previous.basics.recipientName}，今天有一份惊喜给你`;
                        return {
                          ...previous,
                          basics: {
                            ...previous.basics,
                            recipientName: nextName,
                            openingTitle:
                              previous.basics.openingTitle === oldGenerated
                                ? `${nextName}，今天有一份惊喜给你`
                                : previous.basics.openingTitle,
                          },
                        };
                      });
                    }}
                  />
                </Field>
                <Field label="你的称呼">
                  <input
                    value={draft.basics.senderName}
                    maxLength={20}
                    autoComplete="off"
                    onChange={(event) => {
                      const nextName = event.target.value;
                      replaceDraft((previous) => {
                        const oldGenerated = `${previous.basics.senderName} 藏了一段祝福，还有一份需要亲手解锁的礼物。`;
                        return {
                          ...previous,
                          basics: {
                            ...previous.basics,
                            senderName: nextName,
                            openingPrompt:
                              previous.basics.openingPrompt === oldGenerated
                                ? `${nextName} 藏了一段祝福，还有一份需要亲手解锁的礼物。`
                                : previous.basics.openingPrompt,
                          },
                          card: {
                            ...previous.card,
                            signature:
                              previous.card.signature === previous.basics.senderName
                                ? nextName
                                : previous.card.signature,
                          },
                        };
                      });
                    }}
                  />
                </Field>
              </div>

              <fieldset className={styles.fieldset}>
                <legend>生日月日</legend>
                <div className={styles.dateFields}>
                  <label>
                    <span className={styles.srOnly}>月份</span>
                    <select
                      value={month || ""}
                      onChange={(event) => updateBirthday(Number(event.target.value), day || 1)}
                    >
                      <option value="" disabled>选择月份</option>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={value}>{value} 月</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={styles.srOnly}>日期</span>
                    <select
                      value={day || ""}
                      disabled={month === 0}
                      onChange={(event) => updateBirthday(month, Number(event.target.value))}
                    >
                      <option value="" disabled>选择日期</option>
                      {Array.from({ length: month ? daysInMonth(month) : 31 }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={value}>{value} 日</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p>生日密码会自动使用这一天，不会显示年份。</p>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend>Opening 样式</legend>
                <div className={styles.choiceGrid}>
                  {OPENING_TEMPLATES.map((template) => (
                    <ChoiceCard
                      key={template.id}
                      selected={draft.basics.openingTemplateId === template.id}
                      title={template.name}
                      description={template.description}
                      onClick={() => replaceDraft((previous) => ({
                        ...previous,
                        basics: { ...previous.basics, openingTemplateId: template.id },
                      }))}
                    />
                  ))}
                </div>
              </fieldset>

              <Field label="开场标题" hint={`${draft.basics.openingTitle.length} 字`}>
                <input
                  value={draft.basics.openingTitle}
                  maxLength={60}
                  onChange={(event) => replaceDraft((previous) => ({
                    ...previous,
                    basics: { ...previous.basics, openingTitle: event.target.value },
                  }))}
                />
              </Field>
              <Field label="开场引导" hint={`${draft.basics.openingPrompt.length} 字`}>
                <textarea
                  value={draft.basics.openingPrompt}
                  maxLength={120}
                  rows={3}
                  onChange={(event) => replaceDraft((previous) => ({
                    ...previous,
                    basics: { ...previous.basics, openingPrompt: event.target.value },
                  }))}
                />
              </Field>
            </>
          ) : null}

          {currentStep === "unlock" ? (
            <>
              <fieldset className={styles.fieldset}>
                <legend>选择小游戏</legend>
                <div className={styles.choiceGrid}>
                  <ChoiceCard
                    selected={draft.unlock.kind === "find-gift"}
                    title="找礼物"
                    description="在温暖的小房间里找到藏好的礼物"
                    onClick={() => replaceDraft((previous) => ({
                      ...previous,
                      unlock: { kind: "find-gift", targetId: "cabinet-gift" },
                    }))}
                  />
                  <ChoiceCard
                    selected={draft.unlock.kind === "rps"}
                    title="剪刀石头布"
                    description="轻松对战，最迟第三轮解锁"
                    onClick={() => replaceDraft((previous) => ({ ...previous, unlock: { kind: "rps" } }))}
                  />
                  <ChoiceCard
                    selected={draft.unlock.kind === "birthday-password"}
                    title="生日密码"
                    description="用刚才填写的月日作为四位密码"
                    onClick={() => replaceDraft((previous) => ({
                      ...previous,
                      unlock: { kind: "birthday-password" },
                    }))}
                  />
                </div>
              </fieldset>

              {draft.unlock.kind === "find-gift" ? (
                <fieldset className={styles.fieldset}>
                  <legend>把礼物藏在哪里？</legend>
                  <div className={styles.choiceGrid}>
                    {GIFT_TARGETS.map((target) => (
                      <ChoiceCard
                        key={target.id}
                        selected={draft.unlock.kind === "find-gift" && draft.unlock.targetId === target.id}
                        title={target.name}
                        description={target.description}
                        onClick={() => replaceDraft((previous) => ({
                          ...previous,
                          unlock: { kind: "find-gift", targetId: target.id },
                        }))}
                      />
                    ))}
                  </div>
                </fieldset>
              ) : (
                <TadaCompanion
                  message={
                    draft.unlock.kind === "rps"
                      ? "这一项不用再配置，选好就可以继续。"
                      : month && day
                        ? `密码已自动设为 ${month} 月 ${day} 日。`
                        : "先填好生日月日，密码会自动生成。"
                  }
                />
              )}
            </>
          ) : null}

          {currentStep === "card" ? (
            <>
              <fieldset className={styles.fieldset}>
                <legend>卡片样式</legend>
                <div className={styles.choiceGrid}>
                  {CARD_TEMPLATES.map((template) => (
                    <ChoiceCard
                      key={template.id}
                      selected={draft.card.templateId === template.id}
                      title={template.name}
                      description={template.description}
                      onClick={() => replaceDraft((previous) => ({
                        ...previous,
                        card: { ...previous.card, templateId: template.id },
                      }))}
                    />
                  ))}
                </div>
              </fieldset>
              <Field label="生日祝福" hint={`${draft.card.message.length}/240，至少 10 字`}>
                <textarea
                  value={draft.card.message}
                  minLength={10}
                  maxLength={240}
                  rows={7}
                  onChange={(event) => replaceDraft((previous) => ({
                    ...previous,
                    card: { ...previous.card, message: event.target.value },
                  }))}
                />
              </Field>
              <Field label="署名">
                <input
                  value={draft.card.signature}
                  maxLength={20}
                  onChange={(event) => replaceDraft((previous) => ({
                    ...previous,
                    card: { ...previous.card, signature: event.target.value },
                  }))}
                />
              </Field>
            </>
          ) : null}

          {currentStep === "scrapbook" ? (
            <>
              <fieldset className={styles.fieldset}>
                <legend>回忆册版式</legend>
                <div className={styles.choiceGrid}>
                  {SCRAPBOOK_TEMPLATES.map((template) => (
                    <ChoiceCard
                      key={template.id}
                      selected={draft.scrapbook.templateId === template.id}
                      title={template.name}
                      description={template.description}
                      onClick={() => replaceDraft((previous) => ({
                        ...previous,
                        scrapbook: { ...previous.scrapbook, templateId: template.id },
                      }))}
                    />
                  ))}
                </div>
              </fieldset>
              <Field label="回忆册标题">
                <input
                  value={draft.scrapbook.title}
                  maxLength={50}
                  onChange={(event) => replaceDraft((previous) => ({
                    ...previous,
                    scrapbook: { ...previous.scrapbook, title: event.target.value },
                  }))}
                />
              </Field>

              <div className={styles.photoHeading}>
                <div>
                  <strong>照片与说明</strong>
                  <p>最多 3 张，按选择顺序自动填入</p>
                </div>
                <label className={styles.uploadButton}>
                  选择照片
                  <input type="file" accept="image/*" multiple onChange={addPhotos} />
                </label>
              </div>
              {photoError ? <p className={styles.photoError} role="alert">{photoError}</p> : null}
              <div className={styles.photoList}>
                {draft.scrapbook.slots.map((slot, index) => (
                  <article className={styles.photoSlot} key={slot.id}>
                    <div className={styles.photoPreview}>
                      {slot.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local data URL preview is not an optimized remote asset.
                        <img src={slot.imageUrl} alt={`第 ${index + 1} 张回忆预览`} />
                      ) : (
                        <span>照片 {index + 1}</span>
                      )}
                    </div>
                    <div className={styles.photoControls}>
                      <label className={styles.smallButton}>
                        {slot.imageUrl ? "替换" : "添加"}
                        <input type="file" accept="image/*" onChange={(event) => replacePhoto(index, event)} />
                      </label>
                      {slot.imageUrl ? (
                        <button type="button" className={styles.dangerButton} onClick={() => removePhoto(index)}>
                          删除
                        </button>
                      ) : null}
                    </div>
                    <label className={styles.captionField}>
                      <span>照片说明（可选）</span>
                      <input
                        value={slot.caption}
                        maxLength={30}
                        onChange={(event) => replaceDraft((previous) => ({
                          ...previous,
                          scrapbook: {
                            ...previous.scrapbook,
                            slots: previous.scrapbook.slots.map((item, slotIndex) =>
                              slotIndex === index ? { ...item, caption: event.target.value } : item,
                            ),
                          },
                        }))}
                      />
                      <small>{slot.caption.length}/30</small>
                    </label>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {currentStep === "gift" ? (
            <>
              <Field label="礼物名称" hint={`${draft.gift.title.length}/40`}>
                <input
                  value={draft.gift.title}
                  minLength={2}
                  maxLength={40}
                  onChange={(event) => replaceDraft((previous) => ({
                    ...previous,
                    gift: { ...previous.gift, title: event.target.value },
                  }))}
                />
              </Field>
              <Field label="礼物描述（可选）" hint={`${draft.gift.description.length}/120`}>
                <textarea
                  value={draft.gift.description}
                  maxLength={120}
                  rows={4}
                  onChange={(event) => replaceDraft((previous) => ({
                    ...previous,
                    gift: { ...previous.gift, description: event.target.value },
                  }))}
                />
              </Field>
              <Field label="外部礼物链接" hint="仅支持以 https:// 开头的安全链接">
                <input
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={draft.gift.externalUrl}
                  placeholder="https://example.com/gift"
                  onChange={(event) => replaceDraft((previous) => ({
                    ...previous,
                    gift: { ...previous.gift, externalUrl: event.target.value },
                  }))}
                />
              </Field>
              <TadaCompanion message="链接不会自动打开，收礼人拆开礼物后再自己决定。" />
            </>
          ) : null}

          {currentStep === "publish" ? (
            <>
              <section className={styles.summaryCard} aria-label="惊喜内容摘要">
                <div className={styles.summaryTop}>
                  <span className={styles.summaryBadge}>Receiver Preview</span>
                  <span>本地草稿</span>
                </div>
                <h2>{draft.basics.openingTitle}</h2>
                <p>给 {draft.basics.recipientName} · 来自 {draft.basics.senderName}</p>
                <dl>
                  <div><dt>解锁</dt><dd>{draft.unlock.kind === "find-gift" ? "找礼物" : draft.unlock.kind === "rps" ? "剪刀石头布" : "生日密码"}</dd></div>
                  <div><dt>生日卡</dt><dd>{draft.card.message.length} 字祝福</dd></div>
                  <div><dt>回忆册</dt><dd>{draft.scrapbook.slots.filter((slot) => slot.imageUrl).length} 张照片</dd></div>
                  <div><dt>礼物</dt><dd>{draft.gift.title}</dd></div>
                </dl>
              </section>
              <TadaCompanion message="预览会打开完整的收礼流程，但不需要全部走完才能回来修改。" />
              <p className={styles.honestPreviewNote}>
                当前还没有公开分享链接。等本地体验通过后，再接入 Supabase 和真实发布。
              </p>
            </>
          ) : null}
        </section>
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={currentStep === "publish" ? openPreview : goNext}
        >
          {currentStep === "publish" ? "保存并预览" : "继续"}
        </button>
      </footer>
    </main>
  );
}
