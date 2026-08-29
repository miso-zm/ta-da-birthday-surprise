"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import {
  SCRAPBOOK_TEMPLATE_SLOT_COUNTS,
  SENDER_STEPS,
  type FindGiftTargetId,
  type ScrapbookPhotoTransform,
  type ScrapbookTemplateId,
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

import { MobilePicker } from "./mobile-picker";
import styles from "./sender-builder.module.css";

const STEP_META: Record<SenderStep, { title: string; intro: string }> = {
  basics: {
    title: "这份惊喜想送给谁？",
    intro: "填好双方称呼和生日，Ta-da! 会把开场准备好。",
  },
  unlock: {
    title: "想怎么打开这份惊喜？",
    intro: "选一种轻松玩法；不想玩游戏，也可以直接送达。",
  },
  memory: {
    title: "想送贺卡，还是做一本小手帐？",
    intro: "选一种方式，把想说的话和回忆留下来。",
  },
  gift: {
    title: "礼物里装着什么？",
    intro: "收礼人拆开礼物后，才会自己打开这个链接。",
  },
  publish: {
    title: "先看看对方会收到什么",
    intro: "这是本地预览，现在还不会生成公开链接。",
  },
};

const CARD_TEMPLATES = [
  { id: "coral-birthday", name: "珊瑚生日卡", description: "热闹、温暖、适合好友" },
  { id: "cream-wishes", name: "奶油小花卡", description: "安静、柔软、留白更多" },
] as const;

const SCRAPBOOK_TEMPLATES = [
  { id: "one-photo", name: "一张主角", description: "一张大照片，留住最喜欢的一刻", count: 1 },
  { id: "two-photo", name: "两格故事", description: "两张照片，上下记录一段回忆", count: 2 },
  { id: "three-photo", name: "三段回忆", description: "一张大图加两张小图，像一页相册", count: 3 },
] as const;

const GIFT_TARGETS: Array<{
  id: FindGiftTargetId;
  name: string;
  position: string;
  labelPosition: string;
}> = [
  { id: "sofa-box", name: "沙发上的绿礼盒", position: styles.senderSofa, labelPosition: styles.senderSofaLabel },
  { id: "plant-box", name: "花盆旁的黄礼盒", position: styles.senderPlant, labelPosition: styles.senderPlantLabel },
  { id: "rug-box", name: "地毯上的粉礼盒", position: styles.senderRug, labelPosition: styles.senderRugLabel },
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
        {selected ? (
          <svg viewBox="0 0 20 20" focusable="false">
            <path d="m4.5 10.2 3.4 3.4 7.6-8" />
          </svg>
        ) : null}
      </span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}

type GameKind = "find-gift" | "rps" | "blow-candles" | "none";

function GameVisual({ kind }: { kind: GameKind }) {
  if (kind === "find-gift") {
    return <img src="/assets/find-gift/find-gift-room.png" alt="" />;
  }

  if (kind === "blow-candles") {
    return <img src="/assets/blow-candles/blow-candles-preview.png" alt="" />;
  }

  if (kind === "rps") {
    return <img src="/assets/game-previews/tada-rps-preview-v2.png" alt="" />;
  }

  return <img src="/assets/game-previews/tada-direct-preview-v2.png" alt="" />;
}

function GameChoiceCard({
  kind,
  selected,
  title,
  description,
  onClick,
}: {
  kind: GameKind;
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.choiceCard} ${styles.gameChoiceCard} ${selected ? styles.choiceCardSelected : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className={styles.gameVisual} aria-hidden="true"><GameVisual kind={kind} /></span>
      <span className={styles.gameCopy}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className={styles.choiceMark} aria-hidden="true">
        {selected ? (
          <svg viewBox="0 0 20 20" focusable="false">
            <path d="m4.5 10.2 3.4 3.4 7.6-8" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

function ScrapbookTemplateChoice({
  selected,
  template,
  onClick,
}: {
  selected: boolean;
  template: (typeof SCRAPBOOK_TEMPLATES)[number];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.templateChoice} ${selected ? styles.templateChoiceSelected : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className={`${styles.templateThumb} ${styles[`templateThumb${template.count}`]}`} aria-hidden="true">
        {Array.from({ length: template.count }, (_, index) => <i key={index} />)}
        <b />
      </span>
      <span className={styles.templateCopy}>
        <strong>{template.name}</strong>
        <small>{template.description}</small>
      </span>
      <span className={styles.choiceMark} aria-hidden="true">
        {selected ? (
          <svg viewBox="0 0 20 20" focusable="false"><path d="m4.5 10.2 3.4 3.4 7.6-8" /></svg>
        ) : null}
      </span>
    </button>
  );
}

function ErrorPanel({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className={styles.errorPanel} role="alert" aria-live="assertive">
      <strong>还差一点就完成了</strong>
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function photoTransformStyle(transform: ScrapbookPhotoTransform) {
  const maxOffset = ((transform.scale - 1) / transform.scale) * 50;
  return {
    transform: `translate(${transform.x * maxOffset}%, ${transform.y * maxOffset}%) scale(${transform.scale})`,
  };
}

function PhotoCropEditor({
  imageUrl,
  index,
  transform,
  onChange,
}: {
  imageUrl: string;
  index: number;
  transform: ScrapbookPhotoTransform;
  onChange: (transform: ScrapbookPhotoTransform) => void;
}) {
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    transform: ScrapbookPhotoTransform;
  } | null>(null);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      transform,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    onChange({
      ...current.transform,
      x: clamp(current.transform.x + (event.clientX - current.startX) / 90, -1, 1),
      y: clamp(current.transform.y + (event.clientY - current.startY) / 120, -1, 1),
    });
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };

  return (
    <div className={styles.cropEditor}>
      <div
        className={styles.photoPreview}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        aria-label={`调整第 ${index + 1} 张照片：拖动画面移动主体`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview is not an optimized remote asset. */}
        <img src={imageUrl} alt={`第 ${index + 1} 张回忆预览`} draggable={false} style={photoTransformStyle(transform)} />
        <span className={styles.cropHint}>拖动调整主体</span>
      </div>
      <label className={styles.zoomControl}>
        <span>缩放</span>
        <input
          type="range"
          min="1"
          max="2.5"
          step="0.05"
          value={transform.scale}
          onChange={(event) => onChange({ ...transform, scale: Number(event.target.value) })}
        />
      </label>
      <button type="button" className={styles.resetCropButton} onClick={() => onChange({ x: 0, y: 0, scale: 1 })}>
        重置画面
      </button>
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
  const emptyScrapbookSlots = draft.scrapbook.slots.filter((slot) => !slot.imageUrl).length;

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
      const remainingSlots = draft.scrapbook.slots.filter((slot) => !slot.imageUrl).length;
      if (remainingSlots === 0) {
        setPhotoError("这几张照片已经放好了；如需更换，可以在对应照片下单独替换。");
        return;
      }
      const images = await Promise.all(files.slice(0, remainingSlots).map(readImageFile));
      replaceDraft((previous) => {
        const slots = previous.scrapbook.slots.map((slot) => ({ ...slot }));
        for (const imageUrl of images) {
          let index = slots.findIndex((slot) => !slot.imageUrl);
          if (index === -1) break;
          slots[index].imageUrl = imageUrl;
          slots[index].transform = { x: 0, y: 0, scale: 1 };
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
            slotIndex === index ? { ...slot, imageUrl, transform: { x: 0, y: 0, scale: 1 } } : slot,
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
          slotIndex === index ? { ...slot, imageUrl: undefined, transform: { x: 0, y: 0, scale: 1 } } : slot,
        ),
      },
    }));
  }

  function selectScrapbookTemplate(templateId: ScrapbookTemplateId) {
    const slotCount = SCRAPBOOK_TEMPLATE_SLOT_COUNTS[templateId];
    replaceDraft((previous) => ({
      ...previous,
      scrapbook: {
        ...previous.scrapbook,
        templateId,
        slots: Array.from({ length: slotCount }, (_, index) => previous.scrapbook.slots[index] ?? {
          id: `memory-${index + 1}`,
          transform: { x: 0, y: 0, scale: 1 },
        }),
      },
    }));
  }

  function updatePhotoTransform(index: number, transform: ScrapbookPhotoTransform) {
    replaceDraft((previous) => ({
      ...previous,
      scrapbook: {
        ...previous.scrapbook,
        slots: previous.scrapbook.slots.map((slot, slotIndex) =>
          slotIndex === index ? { ...slot, transform } : slot,
        ),
      },
    }));
  }

  if (screen === "loading") {
    return (
      <main className={styles.centeredScreen} aria-busy="true">
        <div className={styles.loadingBlock} role="status" aria-live="polite">
          <div className={styles.loadingMark} aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <p>正在准备你的惊喜…</p>
        </div>
      </main>
    );
  }

  if (screen === "recover" && recoverableDraft) {
    const incomplete = getFirstIncompleteSenderStep(recoverableDraft);
    return (
      <main className={styles.centeredScreen}>
        <section className={styles.recoveryCard} aria-labelledby="recovery-title">
          <TadaCompanion message="上次留下的心意，我已经替你收好啦。" />
          <p className={styles.eyebrow}>上次的惊喜还在这里</p>
          <h1 id="recovery-title">要继续完成它吗？</h1>
          <p className={styles.recoveryCopy}>
            给 <strong>{recoverableDraft.basics.recipientName || "朋友"}</strong> 的惊喜，
            上次保存于 {formatSavedTime(recoverableDraft.updatedAt)}。
          </p>
          <p className={styles.progressNote}>
            从第 {stepIndex(incomplete) + 1} 步继续
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
  const selectedGiftTargetId = draft.unlock.kind === "find-gift"
    ? draft.unlock.targetId
    : "sofa-box";

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={goBack}>
          {currentIndex === 0 ? "退出" : "返回"}
        </button>
        <div className={styles.progress} aria-label={`第 ${currentIndex + 1} 步，共 ${SENDER_STEPS.length} 步`}>
          <span>{currentIndex + 1}/{SENDER_STEPS.length}</span>
          <div className={styles.progressTrack} aria-hidden="true">
            <i style={{ width: `${((currentIndex + 1) / SENDER_STEPS.length) * 100}%` }} />
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
                        return {
                          ...previous,
                          basics: {
                            ...previous.basics,
                            recipientName: nextName,
                            openingTitle: `${nextName || "你"}，生日快乐！`,
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
                        return {
                          ...previous,
                          basics: {
                            ...previous.basics,
                            senderName: nextName,
                            openingPrompt: `${nextName || "你的朋友"} 留了一段想对你说的话，还有一份小礼物，等你亲手打开。`,
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
                  <MobilePicker
                    label="月份"
                    value={month || ""}
                    options={Array.from({ length: 12 }, (_, index) => ({
                      value: index + 1,
                      label: `${index + 1} 月`,
                    }))}
                    onChange={(nextMonth) => updateBirthday(nextMonth, day || 1)}
                  />
                  <MobilePicker
                    label="日期"
                    value={day || ""}
                    options={Array.from(
                      { length: month ? daysInMonth(month) : 31 },
                      (_, index) => ({ value: index + 1, label: `${index + 1} 日` }),
                    )}
                    columns={5}
                    disabled={month === 0}
                    disabledText="先选月份"
                    onChange={(nextDay) => updateBirthday(month, nextDay)}
                  />
                </div>
              </fieldset>
            </>
          ) : null}

          {currentStep === "unlock" ? (
            <>
              <fieldset className={styles.fieldset}>
                <legend>选择小游戏</legend>
                <div className={styles.choiceGrid}>
                  <GameChoiceCard
                    kind="find-gift"
                    selected={draft.unlock.kind === "find-gift"}
                    title="找礼物"
                    description="在小房间里找出藏好的礼物"
                    onClick={() => replaceDraft((previous) => ({
                      ...previous,
                      unlock: { kind: "find-gift", targetId: "sofa-box" },
                    }))}
                  />
                  <GameChoiceCard
                    kind="rps"
                    selected={draft.unlock.kind === "rps"}
                    title="剪刀石头布"
                    description="和 Tada 猜一拳，最晚第三轮就能过关"
                    onClick={() => replaceDraft((previous) => ({ ...previous, unlock: { kind: "rps" } }))}
                  />
                  <GameChoiceCard
                    kind="blow-candles"
                    selected={draft.unlock.kind === "blow-candles"}
                    title="吹蜡烛"
                    description="对着麦克风吹一吹，也能按住按钮完成"
                    onClick={() => replaceDraft((previous) => ({
                      ...previous,
                      unlock: { kind: "blow-candles" },
                    }))}
                  />
                  <GameChoiceCard
                    kind="none"
                    selected={draft.unlock.kind === "none"}
                    title="直接送达"
                    description="跳过小游戏，直接送出心意和礼物"
                    onClick={() => replaceDraft((previous) => ({
                      ...previous,
                      unlock: { kind: "none" },
                    }))}
                  />
                </div>
              </fieldset>

              {draft.unlock.kind === "find-gift" ? (
                <fieldset className={styles.fieldset}>
                  <legend>选择真正装着惊喜的礼物盒</legend>
                  <p className={styles.giftRoomIntro}>对方会看到同一间房，并在这三只礼物盒中猜答案。</p>
                  <div className={styles.giftRoom}>
                    <img
                      src="/assets/find-gift/find-gift-room.png"
                      alt="温暖房间里有沙发上的绿礼盒、花盆旁的黄礼盒和地毯上的粉礼盒"
                    />
                    {GIFT_TARGETS.map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        aria-label={`选择${target.name}`}
                        aria-pressed={selectedGiftTargetId === target.id}
                        className={`${styles.giftTarget} ${target.position} ${selectedGiftTargetId === target.id ? styles.giftTargetSelected : ""}`}
                        onClick={() => replaceDraft((previous) => ({
                          ...previous,
                          unlock: { kind: "find-gift", targetId: target.id },
                        }))}
                      >
                        <span className={styles.giftTargetDot} aria-hidden="true">
                          {selectedGiftTargetId === target.id ? (
                            <svg viewBox="0 0 16 16">
                              <path d="m3.5 8.2 2.8 2.8 6.2-6.2" />
                            </svg>
                          ) : null}
                        </span>
                        <span className={`${styles.giftTargetLabel} ${target.labelPosition}`}>{target.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className={styles.giftRoomSelection} aria-live="polite">
                    已选择：{GIFT_TARGETS.find((target) => target.id === selectedGiftTargetId)?.name}
                  </p>
                </fieldset>
              ) : (
                <TadaCompanion
                  message={
                    draft.unlock.kind === "rps" || draft.unlock.kind === "blow-candles"
                      ? "选好就行，不需要再填写别的内容。"
                      : draft.unlock.kind === "none"
                        ? "对方打开后，会直接看到你准备的心意。"
                        : "先选一个地方，把礼物藏进去吧。"
                  }
                />
              )}
            </>
          ) : null}

          {currentStep === "memory" ? (
            <>
              <fieldset className={styles.fieldset}>
                <legend>选择一种心意内容</legend>
                <div className={styles.choiceGrid}>
                  <ChoiceCard
                    selected={draft.memoryKind === "card"}
                    title="普通贺卡"
                    description="选一张卡片，写下想对对方说的话"
                    onClick={() => replaceDraft((previous) => ({
                      ...previous,
                      memoryKind: "card",
                    }))}
                  />
                  <ChoiceCard
                    selected={draft.memoryKind === "scrapbook"}
                    title="回忆手帐"
                    description="用 1–3 张照片，留住几段回忆"
                    onClick={() => replaceDraft((previous) => ({
                      ...previous,
                      memoryKind: "scrapbook",
                    }))}
                  />
                </div>
              </fieldset>

              {draft.memoryKind === "card" ? (
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
                  <Field label="想对对方说的话" hint={`${draft.card.message.length}/200，至少 10 字`}>
                    <textarea
                      value={draft.card.message}
                      minLength={10}
                      maxLength={200}
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
            </>
          ) : null}

          {currentStep === "memory" && draft.memoryKind === "scrapbook" ? (
            <>
              <fieldset className={styles.fieldset}>
                <legend>回忆册版式</legend>
                <div className={styles.templateChoiceList}>
                  {SCRAPBOOK_TEMPLATES.map((template) => (
                    <ScrapbookTemplateChoice
                      key={template.id}
                      selected={draft.scrapbook.templateId === template.id}
                      template={template}
                      onClick={() => selectScrapbookTemplate(template.id)}
                    />
                  ))}
                </div>
              </fieldset>
              <section className={styles.memoryComposer} aria-label="编辑回忆册内容">
                <div className={styles.memoryComposerHeader}>
                  <div>
                    <strong>把这一页回忆拼好</strong>
                    <p>一句话 + {draft.scrapbook.slots.length} 张照片，就够了。</p>
                  </div>
                  {emptyScrapbookSlots > 0 ? (
                    <label className={styles.uploadButton} aria-label={`一次选择 ${emptyScrapbookSlots} 张照片`}>
                      一次选 {emptyScrapbookSlots} 张
                      <input type="file" accept="image/*" multiple onChange={addPhotos} />
                    </label>
                  ) : (
                    <span className={styles.uploadButton} aria-disabled="true">照片已放好</span>
                  )}
                </div>

                <label className={styles.memoryComposerNote}>
                  <span>想为这些照片留下一句话（可选）</span>
                  <textarea
                    value={draft.scrapbook.description}
                    maxLength={20}
                    rows={2}
                    placeholder="想说的话写在这里……"
                    onChange={(event) => replaceDraft((previous) => ({
                      ...previous,
                      scrapbook: { ...previous.scrapbook, description: event.target.value },
                    }))}
                  />
                  <small>{draft.scrapbook.description.length}/20，最多两行</small>
                </label>

                {photoError ? <p className={styles.photoError} role="alert">{photoError}</p> : null}
                <div className={`${styles.photoList} ${styles[`photoList${draft.scrapbook.slots.length}`]}`}>
                  {draft.scrapbook.slots.map((slot, index) => (
                    <article className={styles.photoSlot} key={slot.id}>
                      {slot.imageUrl ? (
                        <PhotoCropEditor
                          imageUrl={slot.imageUrl}
                          index={index}
                          transform={slot.transform}
                          onChange={(transform) => updatePhotoTransform(index, transform)}
                        />
                      ) : (
                        <label className={styles.emptyPhotoSlot}>
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 7v10M7 12h10M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" /></svg>
                          <span>添加照片 {index + 1}</span>
                          <input type="file" accept="image/*" onChange={(event) => replacePhoto(index, event)} />
                        </label>
                      )}
                      {slot.imageUrl ? (
                        <div className={styles.photoControls}>
                          <label className={styles.smallButton}>
                            替换
                            <input type="file" accept="image/*" onChange={(event) => replacePhoto(index, event)} />
                          </label>
                          <button type="button" className={styles.dangerButton} onClick={() => removePhoto(index)}>
                            删除
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {currentStep === "gift" ? (
            <>
              <Field label="礼物叫什么" hint={`${draft.gift.title.length}/40`}>
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
              <Field label="想补充的话（可选）" hint={`${draft.gift.description.length}/120`}>
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
              <Field label="礼物链接" hint="请填写以 https:// 开头的链接">
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
              <TadaCompanion message="链接不会自己跳开，等对方拆开礼物后再决定要不要看。" />
            </>
          ) : null}

          {currentStep === "publish" ? (
            <>
              <section className={styles.summaryCard} aria-label="惊喜内容摘要">
                <div className={styles.summaryTop}>
                  <span className={styles.summaryBadge}>本地预览</span>
                  <span>本地草稿</span>
                </div>
                <h2>{draft.basics.recipientName || "你"}，生日快乐！</h2>
                <p>给 {draft.basics.recipientName} · 来自 {draft.basics.senderName}</p>
                <dl>
                  <div><dt>惊喜玩法</dt><dd>{draft.unlock.kind === "find-gift" ? "找礼物" : draft.unlock.kind === "rps" ? "剪刀石头布" : draft.unlock.kind === "blow-candles" ? "吹蜡烛" : "直接送达"}</dd></div>
                  <div>
                    <dt>心意内容</dt>
                    <dd>
                      {draft.memoryKind === "card"
                        ? `普通贺卡 · ${draft.card.message.length} 字祝福`
                        : `回忆手帐 · ${draft.scrapbook.slots.filter((slot) => slot.imageUrl).length} 张照片`}
                    </dd>
                  </div>
                  <div><dt>礼物</dt><dd>{draft.gift.title}</dd></div>
                </dl>
              </section>
              <TadaCompanion message="预览会带你看完整流程，不用走完也能回来继续修改。" />
              <p className={styles.honestPreviewNote}>
                现在还是本地预览，公开分享链接会在正式发布时再生成。
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
