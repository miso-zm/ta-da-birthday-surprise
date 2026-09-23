"use client";

import { Check } from "@phosphor-icons/react";
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
  SCRAPBOOK_DESCRIPTION_MAX_LENGTH,
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
  getSenderResumeLocation,
  senderDraftToPreview,
  validateSenderDraft,
} from "../../lib/sender-preview";
import {
  clearSenderDraft,
  getBrowserDraftStorage,
} from "../../lib/sender-draft-storage";
import {
  clearSenderPortraitMedia,
  loadSenderDraftWithMedia,
  saveSenderDraftWithMedia,
} from "../../lib/sender-portrait-media-storage";
import { getPublicGiftLink } from "../../lib/gift-link-policy";
import { TadaCompanion } from "../../components/tada-companion/tada-companion";
import { PrimaryActionDecoration } from "../../components/primary-action-decoration/primary-action-decoration";
import { PortraitEditor } from "./portrait-editor";
import { countDiscardedScrapbookPhotos } from "./scrapbook-template-change";

import placeholderPaper from "./assets/d044/photo-slot-placeholder-paper.webp";
import oneBackground from "./assets/d044/one/background.webp";
import oneDescriptionPaper from "./assets/d044/one/description-torn-paper.webp";
import oneForeground from "./assets/d044/one/foreground-tape-clips-stickers.webp";
import oneOuterDoodles from "./assets/d044/one/outer-doodles-stars.webp";
import onePhotoFrames from "./assets/d044/one/photo-frames.webp";
import onePhotoMask from "./assets/d044/one/photo-slot-1-mask.png";
import threeBackground from "./assets/d044/three/background.webp";
import threeDescriptionPaper from "./assets/d044/three/description-torn-paper.webp";
import threeForeground from "./assets/d044/three/foreground-tape-clips-stickers.webp";
import threeOuterDoodles from "./assets/d044/three/outer-doodles-stars.webp";
import threePhotoFrames from "./assets/d044/three/photo-frames.webp";
import threePhotoMaskOne from "./assets/d044/three/photo-slot-1-mask.png";
import threePhotoMaskTwo from "./assets/d044/three/photo-slot-2-mask.png";
import threePhotoMaskThree from "./assets/d044/three/photo-slot-3-mask.png";
import twoBackground from "./assets/d044/two/background.webp";
import twoDescriptionPaper from "./assets/d044/two/description-torn-paper.webp";
import twoForeground from "./assets/d044/two/foreground-tape-clips-stickers.webp";
import twoOuterDoodles from "./assets/d044/two/outer-doodles-stars.webp";
import twoPhotoFrames from "./assets/d044/two/photo-frames.webp";
import twoPhotoMaskOne from "./assets/d044/two/photo-slot-1-mask.png";
import twoPhotoMaskTwo from "./assets/d044/two/photo-slot-2-mask.png";
import styles from "./sender-builder.module.css";

const STEP_META: Record<SenderStep, { title: string; intro: string }> = {
  basics: {
    title: "这份惊喜想送给谁？",
    intro: "填好双方称呼，Ta-da! 会把开场准备好。",
  },
  unlock: {
    title: "想怎么打开这份惊喜？",
    intro: "选一种轻松玩法；不想玩游戏，也可以直接送达。",
  },
  memory: {
    title: "贺卡还是一页手帐？",
    intro: "选一种方式，把想说的话和回忆留下来。",
  },
  gift: {
    title: "还要准备一份小礼物吗？",
    intro: "没有也没关系，生日卡或手帐本身就是一份礼物。",
  },
  publish: {
    title: "确认并发布",
    intro: "",
  },
};

const CARD_TEMPLATES = [
  { id: "coral-birthday", name: "火漆信封卡", description: "热闹、温暖、适合好友" },
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
type MemoryScreen = "choice" | "scrapbook" | "portrait";

type CropDraft = {
  index: number;
  imageUrl: string;
  transform: ScrapbookPhotoTransform;
};

export type SenderBuilderProps = {
  initialDraft?: SenderDraft;
  onDraftChange?: (draft: SenderDraft) => void;
  onPreview: (preview: SurprisePreview, draft: SenderDraft) => void;
  onPublish: (preview: SurprisePreview, draft: SenderDraft) => Promise<void>;
};

function stepIndex(step: SenderStep): number {
  return SENDER_STEPS.indexOf(step);
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
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      reject(new Error("请选择 JPG、PNG 或 WebP 图片。"));
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
    <label
      className={`${styles.templateChoice} ${selected ? styles.templateChoiceSelected : ""}`}
    >
      <input className={styles.srOnly} type="radio" name="scrapbook-template" checked={selected} onChange={onClick} />
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
    </label>
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

function TadaMessage({ message }: { message: string }) {
  return (
    <div className={styles.companion} aria-label={`Tada 提示：${message}`}>
      <TadaCompanion className={styles.companionArt} />
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
      </div>
      <p className={styles.cropHint}>拖动照片，让主体留在框内</p>
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
  onAddPhoto,
  onImageError,
}: {
  templateId: ScrapbookTemplateId;
  slots?: SenderDraft["scrapbook"]["slots"];
  description?: string;
  brokenPhotoIds?: Set<string>;
  onOpenCrop?: (index: number) => void;
  onAddPhoto?: (index: number) => void;
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
        if (!isOpenable && !onAddPhoto) return null;
        return (
          <button
            key={`photo-${index}-hotspot`}
            type="button"
            className={styles.scrapbookPhotoHotspot}
            aria-label={`${isOpenable ? "调整" : "添加"}第 ${index + 1} 张照片`}
            style={{
              left: `${slotGeometry.x}%`,
              top: `${slotGeometry.y}%`,
              width: `${slotGeometry.width}%`,
              height: `${slotGeometry.height}%`,
            }}
            onClick={() => isOpenable ? onOpenCrop(index) : onAddPhoto?.(index)}
          >
            {!isOpenable ? <span className={styles.emptyPhotoAction}>添加照片</span> : null}
          </button>
        );
      }) : null}
    </div>
  );
}

function ScrapbookPreview({
  draft,
  brokenPhotoIds,
  onOpenCrop,
  onAddPhoto,
  onImageError,
}: {
  draft: SenderDraft["scrapbook"];
  brokenPhotoIds: Set<string>;
  onOpenCrop: (index: number) => void;
  onAddPhoto: (index: number) => void;
  onImageError: (slotId: string) => void;
}) {
  return (
    <div
      className={styles.scrapbookPreview}
      aria-label={`${draft.slots.length} 张照片的一页手帐实时预览`}
    >
      <ScrapbookCanvas
        templateId={draft.templateId}
        slots={draft.slots}
        description={draft.description}
        brokenPhotoIds={brokenPhotoIds}
        onOpenCrop={onOpenCrop}
        onAddPhoto={onAddPhoto}
        onImageError={onImageError}
      />
    </div>
  );
}

export function SenderBuilder({
  initialDraft,
  onDraftChange,
  onPreview,
  onPublish,
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
  const [photoReading, setPhotoReading] = useState(false);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const photoReadInFlight = useRef(false);
  const [photoSlotErrors, setPhotoSlotErrors] = useState<Record<string, string>>({});
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Set<string>>(() => new Set());
  const [memoryScreen, setMemoryScreen] = useState<MemoryScreen>("choice");
  const [openSheet, setOpenSheet] = useState<"template" | "crop" | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<ScrapbookTemplateId | null>(null);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [cropError, setCropError] = useState("");
  const [publishState, setPublishState] = useState<"idle" | "publishing" | "error">("idle");
  const publishRequestInFlight = useRef(false);
  const [publishError, setPublishError] = useState("");
  const [legalConsent, setLegalConsent] = useState(false);
  const [giftInput, setGiftInput] = useState(initialDraft?.gift.externalUrl ?? "");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersion = useRef(0);
  const scrollArea = useRef<HTMLDivElement | null>(null);
  const stepHeading = useRef<HTMLHeadingElement | null>(null);
  const onDraftChangeRef = useRef(onDraftChange);
  const initialized = useRef(false);
  const addPhotoInput = useRef<HTMLInputElement | null>(null);
  const slotPhotoInputs = useRef<Array<HTMLInputElement | null>>([]);
  const legalConsentInput = useRef<HTMLInputElement | null>(null);
  const legalConsentId = useId();

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);

  useEffect(() => {
    let cancelled = false;
    if (initialDraft) {
      setDraft(initialDraft);
      setGiftInput(initialDraft.gift.externalUrl);
      const location = getSenderResumeLocation(initialDraft);
      setCurrentStep(location.step);
      setMemoryScreen(location.memoryScreen ?? "choice");
      setScreen("edit");
      initialized.current = true;
      return () => { cancelled = true; };
    }

    const storage = getBrowserDraftStorage();
    if (!storage) {
      setLoadMessage("当前浏览器无法保存草稿，但你仍然可以继续完成预览。");
      setScreen("welcome");
      return () => { cancelled = true; };
    }

    void loadSenderDraftWithMedia(storage).then((result) => {
      if (cancelled) return;
      if (result.status === "ready") {
        setRecoverableDraft(result.draft);
        setLoadMessage(result.notice ?? "");
        setScreen(window.location.hash === "#draft" ? "recover" : "welcome");
      } else {
        if (result.status === "invalid") setLoadMessage(result.reason);
        setScreen("welcome");
      }
    });
    return () => { cancelled = true; };
  }, [initialDraft]);

  useEffect(() => {
    if (!initialized.current || screen !== "edit") return;

    setSaveState("saving");
    setSaveError("");
    onDraftChangeRef.current?.(draft);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const version = ++saveVersion.current;
    saveTimer.current = setTimeout(() => {
      const storage = getBrowserDraftStorage();
      if (!storage) {
        setSaveState("error");
        setSaveError("当前浏览器无法保存草稿，但不影响继续预览。");
        return;
      }
      void saveSenderDraftWithMedia(storage, draft).then((result) => {
        if (version !== saveVersion.current) return;
        setSaveState(result.ok ? "saved" : "error");
        setSaveError(result.ok ? "" : result.reason);
        if (result.ok) setRecoverableDraft(draft);
      });
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
  const missingScrapbookSlots = draft.scrapbook.slots.filter(
    (slot) => !slot.imageUrl || brokenPhotoIds.has(slot.id),
  ).length;
  const pendingTemplateLossCount = pendingTemplateId
    ? countDiscardedScrapbookPhotos(
        draft.scrapbook.slots,
        SCRAPBOOK_TEMPLATE_SLOT_COUNTS[pendingTemplateId],
        brokenPhotoIds,
      )
    : 0;

  function replaceDraft(updater: (previous: SenderDraft) => SenderDraft) {
    setDraft((previous) => ({
      ...updater(previous),
      updatedAt: new Date().toISOString(),
    }));
    setShowErrors(false);
  }

  function resumeDraft() {
    if (!recoverableDraft) return;
    const location = getSenderResumeLocation(recoverableDraft);
    setDraft(recoverableDraft);
    setGiftInput(recoverableDraft.gift.externalUrl);
    setCurrentStep(location.step);
    setMemoryScreen(location.memoryScreen ?? "choice");
    setScreen("edit");
    setSaveState("saved");
    initialized.current = true;
  }

  function startFresh() {
    const storage = getBrowserDraftStorage();
    if (storage && !clearSenderDraft(storage)) {
      setSaveError("浏览器暂时无法清除旧草稿，本次仍可继续创建。");
    }
    const oldDraftId = recoverableDraft?.draftId ?? draft.draftId;
    void clearSenderPortraitMedia(oldDraftId);
    setDraft(createDefaultSenderDraft());
    setGiftInput("");
    setCurrentStep("basics");
    setRecoverableDraft(null);
    setScreen("edit");
    setSaveState("idle");
    initialized.current = true;
  }

  function startCreating() {
    if (recoverableDraft) { setScreen("recover"); return; }
    setCurrentStep("basics");
    setScreen("edit");
    setSaveState("idle");
    initialized.current = true;
  }

  function goBack() {
    setShowErrors(false);
    setPhotoError("");
    if (currentStep === "memory" && memoryScreen === "portrait") {
      setMemoryScreen(draft.memoryKind === "scrapbook" ? "scrapbook" : "choice");
      return;
    }
    if (currentStep === "memory" && memoryScreen === "scrapbook") {
      setMemoryScreen("choice");
      setOpenSheet(null);
      setCropDraft(null);
      return;
    }
    if (currentIndex === 0) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      onDraftChangeRef.current?.(draft);
      const storage = getBrowserDraftStorage();
      if (storage) {
        void saveSenderDraftWithMedia(storage, draft).then((result) => {
          setSaveState(result.ok ? "saved" : "error");
          setSaveError(result.ok ? "" : result.reason);
        });
      }
      setRecoverableDraft(draft);
      setScreen("welcome");
      return;
    }
    const previousStep = SENDER_STEPS[currentIndex - 1];
    setCurrentStep(previousStep);
    if (previousStep === "memory") setMemoryScreen("portrait");
  }

  function goNext() {
    if (photoReadInFlight.current || portraitBusy) return;
    const errors = validationErrors[currentStep] ?? [];
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (currentStep === "memory" && memoryScreen !== "portrait") {
      setMemoryScreen("portrait");
      return;
    }
    if (currentStep === "memory" && memoryScreen === "portrait") {
      replaceDraft((previous) => ({ ...previous, portraitChoiceMade: true }));
    }
    if (currentIndex < SENDER_STEPS.length - 1) {
      const nextStep = SENDER_STEPS[currentIndex + 1];
      setCurrentStep(nextStep);
      if (nextStep === "memory") setMemoryScreen("choice");
    }
  }

  async function openPreview() {
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
      const saveResult = await saveSenderDraftWithMedia(storage, draft);
      setSaveState(saveResult.ok ? "saved" : "error");
      setSaveError(saveResult.ok ? "" : saveResult.reason);
    } else {
      setSaveState("error");
      setSaveError("当前浏览器无法保存草稿，但不影响继续预览。");
    }
    onPreview(result.preview, draft);
  }

  async function publishSurprise() {
    if (publishRequestInFlight.current) return;
    const result = senderDraftToPreview(draft);
    if (!result.ok) {
      setCurrentStep(result.firstIncompleteStep);
      setShowErrors(true);
      return;
    }
    if (!legalConsent) {
      setPublishState("error");
      setPublishError("请先阅读并完成确认，再发布。");
      requestAnimationFrame(() => {
        legalConsentInput.current?.focus();
      });
      return;
    }
    publishRequestInFlight.current = true;
    setPublishState("publishing");
    setPublishError("");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    onDraftChangeRef.current?.(draft);
    const storage = getBrowserDraftStorage();
    if (storage) {
      const saveResult = await saveSenderDraftWithMedia(storage, draft);
      setSaveState(saveResult.ok ? "saved" : "error");
      setSaveError(saveResult.ok ? "" : saveResult.reason);
    } else {
      setSaveState("error");
      setSaveError("当前浏览器无法保存草稿。");
    }
    try {
      await onPublish(result.preview, draft);
      setPublishState("idle");
    } catch (error) {
      setPublishState("error");
      setPublishError(error instanceof Error ? error.message : "发布没有完成，请重试。");
    } finally {
      publishRequestInFlight.current = false;
    }
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    if (photoReadInFlight.current) return;
    setPhotoError("");

    const targets = draft.scrapbook.slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => !slot.imageUrl || brokenPhotoIds.has(slot.id));
    if (targets.length === 0) {
      setPhotoError("照片已经放好了；点击预览里的照片，可以调整或替换。");
      return;
    }

    const selectedFiles = files.slice(0, targets.length);
    photoReadInFlight.current = true;
    setPhotoReading(true);
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
    photoReadInFlight.current = false;
    setPhotoReading(false);
  }

  async function replacePhoto(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (photoReadInFlight.current) return;
    photoReadInFlight.current = true;
    setPhotoReading(true);
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
    } finally {
      photoReadInFlight.current = false;
      setPhotoReading(false);
    }
  }

  function applyScrapbookTemplate(templateId: ScrapbookTemplateId) {
    if (photoReadInFlight.current) return;
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
      addPhotoInput.current?.click();
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
            <PrimaryActionDecoration />
            <span className={styles.welcomeButtonLabel}>开始准备</span>
          </button>
          <a href="/create/works" className={styles.worksEntry}>我的作品</a>
        </section>
      </main>
    );
  }

  if (screen === "recover" && recoverableDraft) {
    const incomplete = getFirstIncompleteSenderStep(recoverableDraft);
    return (
      <main className={styles.centeredScreen}>
        <section className={styles.recoveryCard} aria-labelledby="recovery-title">
          <TadaMessage message="上次留下的心意，我已经替你收好啦。" />
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
            <span className={styles.primaryButtonLabel}>继续编辑</span>
          </button>
          <button type="button" className={styles.textButton} onClick={startFresh}>
            不用了，重新开始
          </button>
          <a href="/create/works" className={styles.recoveryWorksEntry}>我的作品</a>
        </section>
      </main>
    );
  }

  const meta = currentStep === "memory" && memoryScreen === "scrapbook"
    ? {
        title: "做一页回忆手帐",
        intro: "照片会自动填进固定版式；只有主体被切到时，才需要点照片调整。",
      }
    : currentStep === "memory" && memoryScreen === "portrait"
      ? {
          title: `让 ${draft.basics.recipientName || "TA"} 成为生日主角`,
          intro: "上传一张照片制作最后一页海报，也可以直接跳过。",
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
          <h1
            ref={stepHeading}
            tabIndex={-1}
            className={currentStep === "memory" && memoryScreen === "choice" ? styles.singleLineTitle : undefined}
          >{meta.title}</h1>
          {meta.intro ? <p>{meta.intro}</p> : null}
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

        {!(currentStep === "memory" && memoryScreen === "scrapbook") ? <ErrorPanel errors={currentErrors} /> : null}

        <section className={styles.formSection}>
          {currentStep === "basics" ? (
            <>
              <div className={styles.basicsFields}>
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
                <TadaMessage
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
                    title="一页手帐"
                    description="用 1–3 张照片，留住一段回忆"
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
                <button type="button" className={styles.summaryAction} disabled={photoReading} onClick={() => {
                  setPendingTemplateId(draft.scrapbook.templateId);
                  setOpenSheet("template");
                }}>
                  更换版式
                </button>
              </section>

              {photoReading ? <p role="status">正在放入照片，请稍等…</p> : null}
              <section className={styles.previewSection} aria-labelledby="scrapbook-preview-title">
                <div className={styles.sectionHeading}>
                  <div>
                    <span className={styles.sectionKicker}>实时预览</span>
                    <h2 id="scrapbook-preview-title">点照片调整，点空位添加</h2>
                  </div>
                  <span
                    className={missingScrapbookSlots > 0 ? styles.missingCount : styles.completeCount}
                    aria-live="polite"
                  >
                    {missingScrapbookSlots > 0 ? `还差 ${missingScrapbookSlots} 张` : "照片已放好"}
                  </span>
                </div>
                <p className={styles.privacyHint}>照片会保存在当前浏览器；发布时将上传用于手帐展示。</p>

                <input ref={addPhotoInput} className={styles.srOnly} tabIndex={-1} aria-hidden="true" type="file" accept="image/jpeg,image/png,image/webp" multiple={missingScrapbookSlots > 1} onChange={addPhotos} />
                {draft.scrapbook.slots.map((slot, index) => (
                  <input key={slot.id} ref={(node) => { slotPhotoInputs.current[index] = node; }} className={styles.srOnly} tabIndex={-1} aria-hidden="true" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => replacePhoto(index, event)} />
                ))}

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
                          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => replacePhoto(index, event)} />
                        </label>
                      </div>
                    );
                  })}
                </div>
                <ScrapbookPreview
                  draft={draft.scrapbook}
                  brokenPhotoIds={brokenPhotoIds}
                  onOpenCrop={openCropEditor}
                  onAddPhoto={(index) => slotPhotoInputs.current[index]?.click()}
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
                  maxLength={SCRAPBOOK_DESCRIPTION_MAX_LENGTH}
                  rows={2}
                  placeholder="例如：那天的风和笑声都还记得"
                  onChange={(event) => replaceDraft((previous) => ({
                    ...previous,
                    scrapbook: {
                      ...previous.scrapbook,
                      description: event.target.value.replace(/[\r\n]+/g, ""),
                    },
                  }))}
                />
                <small>
                  {draft.scrapbook.description.length}/{SCRAPBOOK_DESCRIPTION_MAX_LENGTH}，最多两行
                </small>
              </label>
              {currentErrors.length > 0 && missingScrapbookSlots === 0 ? <ErrorPanel errors={currentErrors} /> : null}
            </>
          ) : null}

          {currentStep === "memory" && memoryScreen === "portrait" ? (
            <PortraitEditor
              value={draft.portrait}
              recipientName={draft.basics.recipientName}
              onBusyChange={setPortraitBusy}
              onChange={(portrait) => replaceDraft((previous) => ({
                ...previous,
                portraitChoiceMade: false,
                ...(portrait ? { portrait } : { portrait: undefined }),
              }))}
            />
          ) : null}

          {currentStep === "gift" ? (
            <>
              <fieldset className={styles.fieldset}>
                <legend>选择礼物安排</legend>
                <div className={styles.choiceGrid}>
                  <ChoiceCard
                    selected={draft.gift.kind === "none"}
                    title="这次只送生日贺卡"
                    description="不加额外礼物，直接把这份生日卡或手帐送给 TA"
                    onClick={() => {
                      setGiftInput("");
                      replaceDraft((previous) => ({
                        ...previous,
                        gift: { kind: "none", title: "", description: "", externalUrl: "" },
                      }));
                    }}
                  />
                  <ChoiceCard
                    selected={draft.gift.kind === "link"}
                    title="还有一份小礼物"
                    description="粘贴淘宝或京东送礼后复制的内容"
                    onClick={() => {
                      setGiftInput("");
                      replaceDraft((previous) => ({
                        ...previous,
                        gift: { kind: "link", title: "", description: "", externalUrl: "" },
                      }));
                    }}
                  />
                </div>
              </fieldset>

              {draft.gift.kind === "link" ? (
                <>
                  <Field label="礼物链接" hint="可直接粘贴平台复制的整段内容，Ta-da! 会自动提取链接">
                    <textarea
                      rows={3}
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      maxLength={4096}
                      value={giftInput}
                      placeholder="粘贴淘宝或京东送礼内容"
                      onChange={(event) => {
                        const pastedValue = event.target.value;
                        const extracted = getPublicGiftLink(pastedValue);
                        setGiftInput(pastedValue);
                        replaceDraft((previous) => ({
                          ...previous,
                          gift: { kind: "link", title: "", description: "", externalUrl: extracted?.url ?? "" },
                        }));
                      }}
                    />
                  </Field>
                  {giftInput.trim() && !getPublicGiftLink(giftInput) ? (
                    <p className={styles.notice} role="alert">没有识别到唯一可用的淘宝或京东送礼链接，请检查后继续编辑。</p>
                  ) : null}
                  <TadaMessage message="淘宝提取码请另行发给 TA；送礼链接可能由最先打开的人领取。" />
                </>
              ) : null}
            </>
          ) : null}

          {currentStep === "publish" ? (
            <>
              <section className={styles.summaryCard} aria-label="惊喜内容摘要">
                <h2>{draft.basics.recipientName || "你"}，生日快乐！</h2>
                <p>给 {draft.basics.recipientName} · 来自 {draft.basics.senderName}</p>
                <dl>
                  <div><dt>惊喜玩法</dt><dd>{draft.unlock.kind === "find-gift" ? "找礼物" : draft.unlock.kind === "rps" ? "剪刀石头布" : draft.unlock.kind === "blow-candles" ? "吹蜡烛" : "直接送达"}</dd></div>
                  <div>
                    <dt>心意内容</dt>
                    <dd>
                      {draft.memoryKind === "card"
                        ? "普通贺卡"
                        : `一页手帐 · ${draft.scrapbook.slots.filter((slot) => slot.imageUrl).length} 张照片`}
                    </dd>
                  </div>
                  <div>
                    <dt>最后一页</dt>
                    <dd>{draft.portrait ? "生日主角海报" : "Tada 插画"}</dd>
                  </div>
                  <div>
                    <dt>额外礼物</dt>
                    <dd>{draft.gift.kind === "link" ? "礼物链接" : "无"}</dd>
                  </div>
                </dl>
              </section>
              <button type="button" className={styles.secondaryAction} onClick={openPreview}>
                预览完整流程
              </button>
              <p className={styles.shareWarning}>
                {draft.gift.kind === "link"
                  ? "链接可转发；送礼链接可能先到先得。有效 1 年，可随时收回。"
                  : "链接可转发，有效 1 年，可随时收回。"}
              </p>
              <div className={styles.consentGroup}>
                <div className={styles.consentRow}>
                  <span className={styles.consentControl}>
                    <input ref={legalConsentInput} id={legalConsentId} type="checkbox" aria-label="同意用户协议和隐私政策" checked={legalConsent} onChange={(event) => { setLegalConsent(event.target.checked); setPublishError(""); }} />
                    <span className={styles.consentBox} aria-hidden="true"><Check size={14} weight="bold" /></span>
                  </span>
                  <div><label htmlFor={legalConsentId}>我已阅读并同意</label><span> </span><a href="/terms" target="_blank" rel="noopener">《用户协议》</a><span>，并已阅读</span><a href="/privacy" target="_blank" rel="noopener">《隐私政策》</a><span>。</span></div>
                </div>
              </div>
              {publishError ? <p className={styles.publishError} role="alert">{publishError}</p> : null}
            </>
          ) : null}
        </section>
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={currentStep === "publish"
            ? publishSurprise
            : currentStep === "memory" && memoryScreen === "scrapbook"
              ? completeScrapbook
              : goNext}
          disabled={publishState === "publishing" || photoReading || portraitBusy}
        >
          <span className={styles.primaryButtonLabel}>
            {portraitBusy
              ? "正在制作主角海报…"
              : currentStep === "publish"
              ? publishState === "publishing" ? "正在发布…" : "发布惊喜"
              : currentStep === "memory" && memoryScreen === "scrapbook"
                ? missingScrapbookSlots > 0 ? `再选 ${missingScrapbookSlots} 张照片` : "完成手帐"
                : currentStep === "memory" && memoryScreen === "portrait"
                  ? draft.portrait ? "完成并继续" : "不上传，继续"
                : "继续"}
          </span>
        </button>
      </footer>

      {openSheet === "template" ? (
        <BottomSheet
          eyebrow="固定 3:4 版式"
          title="选择手帐版式"
          onClose={() => {
            setOpenSheet(null);
            setPendingTemplateId(null);
          }}
        >
            <div className={styles.templateSheetList} role="radiogroup" aria-label="手帐版式">
              {SCRAPBOOK_TEMPLATES.map((template) => (
                <ScrapbookTemplateChoice
                  key={template.id}
                  selected={pendingTemplateId === template.id}
                  template={template}
                  onClick={() => setPendingTemplateId(template.id)}
                />
              ))}
            </div>
            <div className={styles.templateConfirm}>
              {pendingTemplateLossCount > 0 ? (
                <>
                  <p role="alert">换成这个版式会移除后面的 {pendingTemplateLossCount} 张照片，前面的照片会保留。</p>
                  <div>
                    <button type="button" onClick={() => setPendingTemplateId(draft.scrapbook.templateId)}>保留当前版式</button>
                    <button type="button" className={styles.primaryButton} onClick={() => { if (pendingTemplateId) applyScrapbookTemplate(pendingTemplateId); }}>
                      <span className={styles.primaryButtonLabel}>移除 {pendingTemplateLossCount} 张并使用</span>
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className={styles.primaryButton} disabled={!pendingTemplateId} onClick={() => { if (pendingTemplateId) applyScrapbookTemplate(pendingTemplateId); }}>
                  <span className={styles.primaryButtonLabel}>使用这个版式</span>
                </button>
              )}
            </div>
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
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={replaceCropPhoto} />
              </label>
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={Boolean(cropError)}
              onClick={confirmCrop}
            >
              <span className={styles.primaryButtonLabel}>完成调整</span>
            </button>
          </div>
        </BottomSheet>
      ) : null}
    </main>
  );
}
