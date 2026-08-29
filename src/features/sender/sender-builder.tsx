"use client";

import NextImage from "next/image";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
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
import placeholderPaper from "./assets/d044/photo-slot-placeholder-paper.png";
import oneBackground from "./assets/d044/one/background.png";
import oneDescriptionPaper from "./assets/d044/one/description-torn-paper.png";
import oneForeground from "./assets/d044/one/foreground-tape-clips-stickers.png";
import oneOuterDoodles from "./assets/d044/one/outer-doodles-stars.png";
import onePhotoFrames from "./assets/d044/one/photo-frames.png";
import onePhotoMask from "./assets/d044/one/photo-slot-1-mask.png";
import threeBackground from "./assets/d044/three/background.png";
import threeDescriptionPaper from "./assets/d044/three/description-torn-paper.png";
import threeForeground from "./assets/d044/three/foreground-tape-clips-stickers.png";
import threeOuterDoodles from "./assets/d044/three/outer-doodles-stars.png";
import threePhotoFrames from "./assets/d044/three/photo-frames.png";
import threePhotoMaskOne from "./assets/d044/three/photo-slot-1-mask.png";
import threePhotoMaskTwo from "./assets/d044/three/photo-slot-2-mask.png";
import threePhotoMaskThree from "./assets/d044/three/photo-slot-3-mask.png";
import twoBackground from "./assets/d044/two/background.png";
import twoDescriptionPaper from "./assets/d044/two/description-torn-paper.png";
import twoForeground from "./assets/d044/two/foreground-tape-clips-stickers.png";
import twoOuterDoodles from "./assets/d044/two/outer-doodles-stars.png";
import twoPhotoFrames from "./assets/d044/two/photo-frames.png";
import twoPhotoMaskOne from "./assets/d044/two/photo-slot-1-mask.png";
import twoPhotoMaskTwo from "./assets/d044/two/photo-slot-2-mask.png";
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
  {
    id: "one-photo",
    name: "一张主角",
    description: "居中大相纸，留住最喜欢的一刻",
    count: 1,
    assets: {
      background: oneBackground,
      frames: onePhotoFrames,
      foreground: oneForeground,
      outerDoodles: oneOuterDoodles,
      descriptionPaper: oneDescriptionPaper,
      masks: [onePhotoMask],
    },
  },
  {
    id: "two-photo",
    name: "两格故事",
    description: "上方横相纸 + 下方单张相纸",
    count: 2,
    assets: {
      background: twoBackground,
      frames: twoPhotoFrames,
      foreground: twoForeground,
      outerDoodles: twoOuterDoodles,
      descriptionPaper: twoDescriptionPaper,
      masks: [twoPhotoMaskOne, twoPhotoMaskTwo],
    },
  },
  {
    id: "three-photo",
    name: "三段回忆",
    description: "上方横相纸 + 下方两张方相纸",
    count: 3,
    assets: {
      background: threeBackground,
      frames: threePhotoFrames,
      foreground: threeForeground,
      outerDoodles: threeOuterDoodles,
      descriptionPaper: threeDescriptionPaper,
      masks: [threePhotoMaskOne, threePhotoMaskTwo, threePhotoMaskThree],
    },
  },
] as const;

const SCRAPBOOK_SLOT_GEOMETRY: Record<
  ScrapbookTemplateId,
  ReadonlyArray<{ x: number; y: number; width: number; height: number }>
> = {
  "one-photo": [
    { x: 16.1, y: 16.6, width: 67.5, height: 42.4 },
  ],
  "two-photo": [
    { x: 15.9, y: 12.4, width: 69.2, height: 28.5 },
    { x: 25.2, y: 46.9, width: 51.3, height: 29.6 },
  ],
  "three-photo": [
    { x: 14.4, y: 8.4, width: 71.6, height: 33.5 },
    { x: 13.3, y: 46.3, width: 33.9, height: 25.9 },
    { x: 52.9, y: 46.3, width: 34.3, height: 25.8 },
  ],
};

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

type SaveState = "idle" | "saving" | "saved" | "error";
type MemoryScreen = "choice" | "scrapbook";

type CropDraft = {
  index: number;
  imageUrl: string;
  transform: ScrapbookPhotoTransform;
};

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
        resolve(String(reader.result));
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
      <span className={styles.templateThumb} aria-hidden="true">
        <ScrapbookCanvas templateId={template.id} />
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

function BottomSheet({
  eyebrow,
  title,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>(
        "button:not(:disabled), input:not(:disabled)",
      )?.focus();
    });
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), textarea:not(:disabled)",
      ) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className={styles.sheetBackdrop} onMouseDown={handleBackdropClick}>
      <div
        ref={dialogRef}
        className={styles.bottomSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.sheetHeader}>
          <div>
            <p>{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className={styles.sheetCloseButton} onClick={onClose}>
            关闭
          </button>
        </header>
        {children}
      </div>
    </div>
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

function PhotoCropStage({
  imageUrl,
  index,
  transform,
  onChange,
  onImageError,
  slotCount,
}: {
  imageUrl: string;
  index: number;
  transform: ScrapbookPhotoTransform;
  onChange: (transform: ScrapbookPhotoTransform) => void;
  onImageError: () => void;
  slotCount: number;
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
    const scale = Math.max(current.transform.scale, 1.05);
    onChange({
      ...current.transform,
      scale,
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
        className={`${styles.cropStage} ${styles[`cropStage${slotCount}_${index + 1}`]}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        aria-label={`调整第 ${index + 1} 张照片：拖动画面移动主体`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview is not an optimized remote asset. */}
        <img
          src={imageUrl}
          alt={`第 ${index + 1} 张回忆裁切预览`}
          draggable={false}
          style={photoTransformStyle(transform)}
          onError={onImageError}
        />
        <span className={styles.cropHint}>拖动照片，让主体留在框内</span>
      </div>
      <label className={styles.cropZoomControl}>
        <span>缩放</span>
        <input
          type="range"
          min="1"
          max="2.5"
          step="0.05"
          value={transform.scale}
          aria-label="照片缩放"
          onChange={(event) => onChange({ ...transform, scale: Number(event.target.value) })}
        />
        <output>{Math.round(transform.scale * 100)}%</output>
      </label>
    </div>
  );
}

function ScrapbookCanvas({
  templateId,
  slots = [],
  description = "",
  brokenPhotoIds = new Set<string>(),
  onOpenCrop,
  onImageError,
}: {
  templateId: ScrapbookTemplateId;
  slots?: SenderDraft["scrapbook"]["slots"];
  description?: string;
  brokenPhotoIds?: Set<string>;
  onOpenCrop?: (index: number) => void;
  onImageError?: (slotId: string) => void;
}) {
  const template = SCRAPBOOK_TEMPLATES.find((item) => item.id === templateId)
    ?? SCRAPBOOK_TEMPLATES[0];
  const geometry = SCRAPBOOK_SLOT_GEOMETRY[template.id];

  return (
    <div className={`${styles.scrapbookCanvas} ${styles[`scrapbookCanvas${template.count}`]}`}>
      <img className={`${styles.scrapbookLayer} ${styles.backgroundLayer}`} src={template.assets.background.src} alt="" aria-hidden="true" />
      {geometry.map((slotGeometry, index) => {
        const slot = slots[index];
        const isBroken = Boolean(slot?.imageUrl) && brokenPhotoIds.has(slot.id);
        const imageUrl = slot?.imageUrl && !isBroken ? slot.imageUrl : placeholderPaper.src;
        const mask = template.assets.masks[index];
        const maskedLayerStyle: CSSProperties = {
          maskImage: `url("${mask.src}")`,
          maskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskImage: `url("${mask.src}")`,
          WebkitMaskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
        };
        const photoStyle: CSSProperties = {
          left: `${slotGeometry.x}%`,
          top: `${slotGeometry.y}%`,
          width: `${slotGeometry.width}%`,
          height: `${slotGeometry.height}%`,
          ...(slot?.imageUrl && !isBroken ? photoTransformStyle(slot.transform) : {}),
        };

        return (
          <div key={mask.src} className={styles.maskedPhotoLayer} style={maskedLayerStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview is not an optimized remote asset. */}
            <img
              className={styles.scrapbookPhotoContent}
              src={imageUrl}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={photoStyle}
              onError={slot?.imageUrl ? () => onImageError?.(slot.id) : undefined}
            />
          </div>
        );
      })}
      <img className={`${styles.scrapbookLayer} ${styles.framesLayer}`} src={template.assets.frames.src} alt="" aria-hidden="true" />
      <img className={`${styles.scrapbookLayer} ${styles.foregroundLayer}`} src={template.assets.foreground.src} alt="" aria-hidden="true" />
      <img className={`${styles.scrapbookLayer} ${styles.outerLayer}`} src={template.assets.outerDoodles.src} alt="" aria-hidden="true" />
      <img className={`${styles.scrapbookLayer} ${styles.descriptionPaperLayer}`} src={template.assets.descriptionPaper.src} alt="" aria-hidden="true" />
      {description ? <p className={styles.previewDescription}>{description}</p> : null}
      {onOpenCrop ? geometry.map((slotGeometry, index) => {
        const slot = slots[index];
        const isOpenable = Boolean(slot?.imageUrl) && !brokenPhotoIds.has(slot.id);
        if (!isOpenable) return null;
        return (
          <button
            key={`${slot.id}-hotspot`}
            type="button"
            className={styles.scrapbookPhotoHotspot}
            aria-label={`调整第 ${index + 1} 张照片`}
            style={{
              left: `${slotGeometry.x}%`,
              top: `${slotGeometry.y}%`,
              width: `${slotGeometry.width}%`,
              height: `${slotGeometry.height}%`,
            }}
            onClick={() => onOpenCrop(index)}
          />
        );
      }) : null}
    </div>
  );
}

function ScrapbookPreview({
  draft,
  brokenPhotoIds,
  onOpenCrop,
  onImageError,
}: {
  draft: SenderDraft["scrapbook"];
  brokenPhotoIds: Set<string>;
  onOpenCrop: (index: number) => void;
  onImageError: (slotId: string) => void;
}) {
  return (
    <div
      className={styles.scrapbookPreview}
      aria-label={`${draft.slots.length} 张照片的回忆手帐实时预览`}
    >
      <ScrapbookCanvas
        templateId={draft.templateId}
        slots={draft.slots}
        description={draft.description}
        brokenPhotoIds={brokenPhotoIds}
        onOpenCrop={onOpenCrop}
        onImageError={onImageError}
      />
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
  const [screen, setScreen] = useState<"loading" | "welcome" | "recover" | "edit">("loading");
  const [recoverableDraft, setRecoverableDraft] = useState<SenderDraft | null>(null);
  const [loadMessage, setLoadMessage] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoSlotErrors, setPhotoSlotErrors] = useState<Record<string, string>>({});
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Set<string>>(() => new Set());
  const [memoryScreen, setMemoryScreen] = useState<MemoryScreen>("choice");
  const [openSheet, setOpenSheet] = useState<"template" | "crop" | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<ScrapbookTemplateId | null>(null);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [cropError, setCropError] = useState("");
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
      setScreen("welcome");
      return;
    }

    const result = loadSenderDraft(storage);
    if (result.status === "ready") {
      setRecoverableDraft(result.draft);
      setScreen("recover");
    } else {
      if (result.status === "invalid") setLoadMessage(result.reason);
      setDraft(createDefaultSenderDraft());
      setScreen("welcome");
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
  const missingScrapbookSlots = draft.scrapbook.slots.filter(
    (slot) => !slot.imageUrl || brokenPhotoIds.has(slot.id),
  ).length;

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

  function startCreating() {
    setCurrentStep("basics");
    setScreen("edit");
    setSaveState("idle");
    initialized.current = true;
  }

  function goBack() {
    setShowErrors(false);
    setPhotoError("");
    if (currentStep === "memory" && memoryScreen === "scrapbook") {
      setMemoryScreen("choice");
      setOpenSheet(null);
      setCropDraft(null);
      return;
    }
    if (currentIndex === 0) {
      onExit?.();
      return;
    }
    const previousStep = SENDER_STEPS[currentIndex - 1];
    setCurrentStep(previousStep);
    if (previousStep === "memory") setMemoryScreen("choice");
  }

  function goNext() {
    const errors = validationErrors[currentStep] ?? [];
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (currentIndex < SENDER_STEPS.length - 1) {
      const nextStep = SENDER_STEPS[currentIndex + 1];
      setCurrentStep(nextStep);
      if (nextStep === "memory") setMemoryScreen("choice");
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

    const targets = draft.scrapbook.slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => !slot.imageUrl || brokenPhotoIds.has(slot.id));
    if (targets.length === 0) {
      setPhotoError("照片已经放好了；点击预览里的照片，可以调整或替换。");
      return;
    }

    const selectedFiles = files.slice(0, targets.length);
    const results = await Promise.allSettled(selectedFiles.map(readImageFile));
    const successfulImages = new Map<number, string>();
    const nextErrors: Record<string, string> = {};
    results.forEach((result, resultIndex) => {
      const target = targets[resultIndex];
      if (result.status === "fulfilled") {
        successfulImages.set(target.index, result.value);
      } else {
        nextErrors[target.slot.id] = result.reason instanceof Error
          ? result.reason.message
          : "这张照片暂时无法读取，请换一张试试。";
      }
    });

    if (successfulImages.size > 0) {
      replaceDraft((previous) => ({
        ...previous,
        scrapbook: {
          ...previous.scrapbook,
          slots: previous.scrapbook.slots.map((slot, index) => successfulImages.has(index)
            ? {
                ...slot,
                imageUrl: successfulImages.get(index),
                transform: { x: 0, y: 0, scale: 1 },
              }
            : slot),
        },
      }));
      setBrokenPhotoIds((previous) => {
        const next = new Set(previous);
        successfulImages.forEach((_, index) => next.delete(draft.scrapbook.slots[index].id));
        return next;
      });
    }
    setPhotoSlotErrors((previous) => {
      const next = { ...previous };
      targets.slice(0, selectedFiles.length).forEach(({ slot }) => delete next[slot.id]);
      return { ...next, ...nextErrors };
    });
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
      setBrokenPhotoIds((previous) => {
        const next = new Set(previous);
        next.delete(draft.scrapbook.slots[index].id);
        return next;
      });
      setPhotoSlotErrors((previous) => {
        const next = { ...previous };
        delete next[draft.scrapbook.slots[index].id];
        return next;
      });
    } catch (error) {
      const slotId = draft.scrapbook.slots[index].id;
      setPhotoSlotErrors((previous) => ({
        ...previous,
        [slotId]: error instanceof Error ? error.message : "照片暂时无法读取。",
      }));
    }
  }

  function applyScrapbookTemplate(templateId: ScrapbookTemplateId) {
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
    const remainingSlotIds = new Set(
      Array.from({ length: slotCount }, (_, index) => `memory-${index + 1}`),
    );
    setBrokenPhotoIds((previous) => new Set(
      [...previous].filter((slotId) => remainingSlotIds.has(slotId)),
    ));
    setPhotoSlotErrors((previous) => Object.fromEntries(
      Object.entries(previous).filter(([slotId]) => remainingSlotIds.has(slotId)),
    ));
    setOpenSheet(null);
    setPendingTemplateId(null);
    setPhotoError("");
  }

  function selectScrapbookTemplate(templateId: ScrapbookTemplateId) {
    const nextSlotCount = SCRAPBOOK_TEMPLATE_SLOT_COUNTS[templateId];
    const discardedPhotoCount = draft.scrapbook.slots
      .slice(nextSlotCount)
      .filter((slot) => slot.imageUrl && !brokenPhotoIds.has(slot.id)).length;
    if (discardedPhotoCount > 0) {
      setPendingTemplateId(templateId);
      return;
    }
    applyScrapbookTemplate(templateId);
  }

  function chooseScrapbook() {
    replaceDraft((previous) => ({
      ...previous,
      memoryKind: "scrapbook",
      scrapbook: {
        ...previous.scrapbook,
        description: previous.scrapbook.description === "一起收藏这一天"
          ? ""
          : previous.scrapbook.description,
      },
    }));
    setMemoryScreen("scrapbook");
  }

  function openCropEditor(index: number) {
    const slot = draft.scrapbook.slots[index];
    if (!slot.imageUrl || brokenPhotoIds.has(slot.id)) return;
    setCropDraft({
      index,
      imageUrl: slot.imageUrl,
      transform: { ...slot.transform },
    });
    setCropError("");
    setOpenSheet("crop");
  }

  async function replaceCropPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !cropDraft) return;
    setCropError("");
    try {
      const imageUrl = await readImageFile(file);
      setCropDraft({
        ...cropDraft,
        imageUrl,
        transform: { x: 0, y: 0, scale: 1 },
      });
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "照片暂时无法读取。");
    }
  }

  function confirmCrop() {
    if (!cropDraft) return;
    const { index, imageUrl, transform } = cropDraft;
    replaceDraft((previous) => ({
      ...previous,
      scrapbook: {
        ...previous.scrapbook,
        slots: previous.scrapbook.slots.map((slot, slotIndex) => slotIndex === index
          ? { ...slot, imageUrl, transform }
          : slot),
      },
    }));
    const slotId = draft.scrapbook.slots[index].id;
    setBrokenPhotoIds((previous) => {
      const next = new Set(previous);
      next.delete(slotId);
      return next;
    });
    setPhotoSlotErrors((previous) => {
      const next = { ...previous };
      delete next[slotId];
      return next;
    });
    setOpenSheet(null);
    setCropDraft(null);
  }

  function completeScrapbook() {
    if (missingScrapbookSlots > 0) {
      setPhotoError(`还差 ${missingScrapbookSlots} 张照片，请补齐后再完成心意。`);
      setShowErrors(true);
      scrollArea.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    goNext();
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

  if (screen === "welcome") {
    return (
      <main className={styles.welcomeScreen}>
        <section className={styles.welcomeFrame} aria-labelledby="sender-welcome-title">
          <NextImage
            src="/assets/sender/sender-welcome-bg-v1.png"
            alt=""
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className={styles.welcomeBackground}
          />

          <div className={styles.srOnly}>
            <h1 id="sender-welcome-title">准备一份心意，给 TA 一个惊喜</h1>
            <p>为重要的人制作一份超有仪式感的生日惊喜。</p>
          </div>

          <button
            type="button"
            className={styles.welcomeButton}
            onClick={startCreating}
            aria-label="开始准备生日惊喜"
          >
            <NextImage
              src="/assets/sender/sender-welcome-button-v1.png"
              alt=""
              fill
              priority
              sizes="270px"
              className={styles.welcomeButtonArtwork}
            />
            <span className={styles.welcomeStarField} aria-hidden="true">
              <span className={styles.welcomeStarSmall} />
              <span className={styles.welcomeStarLarge} />
            </span>
          </button>
        </section>
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

  const meta = currentStep === "memory" && memoryScreen === "scrapbook"
    ? {
        title: "做一页回忆手帐",
        intro: "照片会自动填进固定版式；只有主体被切到时，才需要点照片调整。",
      }
    : STEP_META[currentStep];
  const selectedScrapbookTemplate = SCRAPBOOK_TEMPLATES.find(
    (template) => template.id === draft.scrapbook.templateId,
  ) ?? SCRAPBOOK_TEMPLATES[0];
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

          {currentStep === "memory" && memoryScreen === "choice" ? (
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
                    onClick={chooseScrapbook}
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

          {currentStep === "memory" && memoryScreen === "scrapbook" ? (
            <>
              <section className={styles.layoutSummary} aria-labelledby="layout-summary-title">
                <span className={styles.templateThumb} aria-hidden="true">
                  <ScrapbookCanvas templateId={selectedScrapbookTemplate.id} />
                </span>
                <div>
                  <span className={styles.sectionKicker}>当前版式</span>
                  <h2 id="layout-summary-title">{selectedScrapbookTemplate.name}</h2>
                  <p>{selectedScrapbookTemplate.description}</p>
                </div>
                <button type="button" className={styles.summaryAction} onClick={() => setOpenSheet("template")}>
                  更换版式
                </button>
              </section>

              <section className={styles.photoPickerSection} aria-labelledby="photo-picker-title">
                <div className={styles.sectionHeading}>
                  <div>
                    <span className={styles.sectionKicker}>照片</span>
                    <h2 id="photo-picker-title">按选择顺序自动填槽</h2>
                  </div>
                  <span
                    className={missingScrapbookSlots > 0 ? styles.missingCount : styles.completeCount}
                    aria-live="polite"
                  >
                    {missingScrapbookSlots > 0 ? `还差 ${missingScrapbookSlots} 张` : "照片已放好"}
                  </span>
                </div>

                {missingScrapbookSlots > 0 ? (
                  <label className={styles.photoSelectButton}>
                    {draft.scrapbook.slots.length === 1 ? "选择一张照片" : `选择照片（最多 ${missingScrapbookSlots} 张）`}
                    <input type="file" accept="image/*" multiple={draft.scrapbook.slots.length > 1} onChange={addPhotos} />
                  </label>
                ) : (
                  <p className={styles.photoReadyHint}>需要更换时，点下方预览中的对应照片。</p>
                )}

                {photoError ? <p className={styles.photoError} role="alert">{photoError}</p> : null}
                <div className={styles.slotStatusList}>
                  {draft.scrapbook.slots.map((slot, index) => {
                    const slotError = photoSlotErrors[slot.id] || (brokenPhotoIds.has(slot.id)
                      ? "这张照片没有读出来，请重新选择。"
                      : "");
                    if (!slotError) return null;
                    return (
                      <div key={slot.id} className={styles.slotError} role="alert">
                        <span>照片 {index + 1}：{slotError}</span>
                        <label>
                          重新选择
                          <input type="file" accept="image/*" onChange={(event) => replacePhoto(index, event)} />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={styles.previewSection} aria-labelledby="scrapbook-preview-title">
                <div className={styles.sectionHeading}>
                  <div>
                    <span className={styles.sectionKicker}>实时预览</span>
                    <h2 id="scrapbook-preview-title">点击照片可以调整画面</h2>
                  </div>
                </div>
                <ScrapbookPreview
                  draft={draft.scrapbook}
                  brokenPhotoIds={brokenPhotoIds}
                  onOpenCrop={openCropEditor}
                  onImageError={(slotId) => {
                    setBrokenPhotoIds((previous) => new Set(previous).add(slotId));
                    setPhotoSlotErrors((previous) => ({
                      ...previous,
                      [slotId]: "这张照片没有读出来，请重新选择。",
                    }));
                  }}
                />
              </section>

              <label className={styles.scrapbookNote}>
                <span className={styles.sectionKicker}>共同说明（可选）</span>
                <span className={styles.noteTitle}>给这一页留一句话</span>
                <textarea
                  value={draft.scrapbook.description}
                  maxLength={20}
                  rows={2}
                  placeholder="例如：那天的风和笑声都还记得"
                  onChange={(event) => replaceDraft((previous) => ({
                    ...previous,
                    scrapbook: { ...previous.scrapbook, description: event.target.value },
                  }))}
                />
                <small>{draft.scrapbook.description.length}/20，最多两行</small>
              </label>
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
          onClick={currentStep === "publish"
            ? openPreview
            : currentStep === "memory" && memoryScreen === "scrapbook"
              ? completeScrapbook
              : goNext}
        >
          {currentStep === "publish"
            ? "保存并预览"
            : currentStep === "memory" && memoryScreen === "scrapbook"
              ? "完成心意"
              : "继续"}
        </button>
      </footer>

      {openSheet === "template" ? (
        <BottomSheet
          eyebrow="固定 3:4 版式"
          title="选择回忆手帐版式"
          onClose={() => {
            setOpenSheet(null);
            setPendingTemplateId(null);
          }}
        >
          {pendingTemplateId ? (
            <div className={styles.templateConfirm}>
              <p>换成更少照片的版式后，超出的照片会从这份手帐里移除。</p>
              <div>
                <button type="button" onClick={() => setPendingTemplateId(null)}>保留当前版式</button>
                <button type="button" className={styles.primaryButton} onClick={() => applyScrapbookTemplate(pendingTemplateId)}>
                  确认切换
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.templateSheetList}>
              {SCRAPBOOK_TEMPLATES.map((template) => (
                <ScrapbookTemplateChoice
                  key={template.id}
                  selected={draft.scrapbook.templateId === template.id}
                  template={template}
                  onClick={() => selectScrapbookTemplate(template.id)}
                />
              ))}
            </div>
          )}
        </BottomSheet>
      ) : null}

      {openSheet === "crop" && cropDraft ? (
        <BottomSheet
          eyebrow={`照片 ${cropDraft.index + 1}`}
          title="调整照片主体"
          onClose={() => {
            setOpenSheet(null);
            setCropDraft(null);
            setCropError("");
          }}
        >
          <div className={styles.cropSheetBody}>
            <PhotoCropStage
              imageUrl={cropDraft.imageUrl}
              index={cropDraft.index}
              transform={cropDraft.transform}
              onChange={(transform) => setCropDraft({ ...cropDraft, transform })}
              onImageError={() => setCropError("这张照片没有读出来，请重新选择。")}
              slotCount={draft.scrapbook.slots.length}
            />
            {cropError ? <p className={styles.cropError} role="alert">{cropError}</p> : null}
            <div className={styles.cropSecondaryActions}>
              <button
                type="button"
                onClick={() => setCropDraft({
                  ...cropDraft,
                  transform: { x: 0, y: 0, scale: 1 },
                })}
              >
                重置
              </button>
              <label>
                替换照片
                <input type="file" accept="image/*" onChange={replaceCropPhoto} />
              </label>
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={Boolean(cropError)}
              onClick={confirmCrop}
            >
              完成调整
            </button>
          </div>
        </BottomSheet>
      ) : null}
    </main>
  );
}
