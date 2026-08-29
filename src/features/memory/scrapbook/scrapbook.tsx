"use client";

/* eslint-disable @next/next/no-img-element -- D-044 is a layered poster and Preview photos may be browser-local data URLs. */
import { useState, type CSSProperties } from "react";
import type {
  ScrapbookContent,
  ScrapbookSlot,
  ScrapbookTemplateId,
} from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";

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
import tadaPosterCompanion from "./assets/tada-poster-companion.png";
import {
  getImageFailureKey,
  getPhotoTransformStyle,
  normalizeScrapbookTransform,
} from "./scrapbook-logic";
import styles from "./scrapbook.module.css";

type ScrapbookProps = {
  scrapbook: ScrapbookContent;
  onContinue: () => void;
};

type SlotGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const TEMPLATE_CONFIG = {
  "one-photo": {
    label: "一张主角",
    assets: {
      background: oneBackground,
      frames: onePhotoFrames,
      foreground: oneForeground,
      outerDoodles: oneOuterDoodles,
      descriptionPaper: oneDescriptionPaper,
      masks: [onePhotoMask],
    },
    geometry: [{ x: 16.1, y: 16.6, width: 67.5, height: 42.4 }],
  },
  "two-photo": {
    label: "两格故事",
    assets: {
      background: twoBackground,
      frames: twoPhotoFrames,
      foreground: twoForeground,
      outerDoodles: twoOuterDoodles,
      descriptionPaper: twoDescriptionPaper,
      masks: [twoPhotoMaskOne, twoPhotoMaskTwo],
    },
    geometry: [
      { x: 15.9, y: 12.4, width: 69.2, height: 28.5 },
      { x: 25.2, y: 46.9, width: 51.3, height: 29.6 },
    ],
  },
  "three-photo": {
    label: "三段回忆",
    assets: {
      background: threeBackground,
      frames: threePhotoFrames,
      foreground: threeForeground,
      outerDoodles: threeOuterDoodles,
      descriptionPaper: threeDescriptionPaper,
      masks: [threePhotoMaskOne, threePhotoMaskTwo, threePhotoMaskThree],
    },
    geometry: [
      { x: 14.4, y: 8.4, width: 71.6, height: 33.5 },
      { x: 13.3, y: 46.3, width: 33.9, height: 25.9 },
      { x: 52.9, y: 46.3, width: 34.3, height: 25.8 },
    ],
  },
} satisfies Record<
  ScrapbookTemplateId,
  {
    label: string;
    assets: {
      background: typeof oneBackground;
      frames: typeof onePhotoFrames;
      foreground: typeof oneForeground;
      outerDoodles: typeof oneOuterDoodles;
      descriptionPaper: typeof oneDescriptionPaper;
      masks: ReadonlyArray<typeof onePhotoMask>;
    };
    geometry: ReadonlyArray<SlotGeometry>;
  }
>;

function layerStyle(maskUrl: string): CSSProperties {
  return {
    maskImage: `url("${maskUrl}")`,
    maskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskImage: `url("${maskUrl}")`,
    WebkitMaskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
  };
}

function photoStyle(slot: ScrapbookSlot | undefined, geometry: SlotGeometry): CSSProperties {
  return {
    left: `${geometry.x}%`,
    top: `${geometry.y}%`,
    width: `${geometry.width}%`,
    height: `${geometry.height}%`,
    ...(slot ? getPhotoTransformStyle(normalizeScrapbookTransform(slot.transform)) : {}),
  };
}

export function Scrapbook({ scrapbook, onContinue }: ScrapbookProps) {
  const template = TEMPLATE_CONFIG[scrapbook.templateId];
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  const failedSlots = template.geometry.flatMap((_, index) => {
    const slot = scrapbook.slots[index];
    if (!slot?.imageUrl) return [];
    return failedImages.has(getImageFailureKey(slot)) ? [index] : [];
  });

  return (
    <StageCard label="我们的回忆手帐">
      <div className={styles.posterMount}>
        <article
          className={styles.poster}
          aria-label={`${template.label}回忆手帐，共 ${template.geometry.length} 个照片位`}
        >
          <img className={`${styles.layer} ${styles.backgroundLayer}`} src={template.assets.background.src} alt="" aria-hidden="true" />

          {template.geometry.map((geometry, index) => {
            const slot = scrapbook.slots[index];
            const failureKey = slot ? getImageFailureKey(slot) : "";
            const hasPhoto = Boolean(slot?.imageUrl) && !failedImages.has(failureKey);
            const source = hasPhoto ? slot?.imageUrl : placeholderPaper.src;
            const mask = template.assets.masks[index];

            return (
              <div
                key={`${scrapbook.templateId}-${index}`}
                className={styles.maskedPhotoLayer}
                style={layerStyle(mask.src)}
              >
                <img
                  className={styles.photo}
                  src={source}
                  alt={hasPhoto ? `第 ${index + 1} 张回忆照片` : ""}
                  aria-hidden={!hasPhoto}
                  draggable={false}
                  style={photoStyle(hasPhoto ? slot : undefined, geometry)}
                  onError={hasPhoto && slot
                    ? () => setFailedImages((current) => new Set(current).add(getImageFailureKey(slot)))
                    : undefined}
                />
              </div>
            );
          })}

          <img className={`${styles.layer} ${styles.framesLayer}`} src={template.assets.frames.src} alt="" aria-hidden="true" />
          <img className={`${styles.layer} ${styles.foregroundLayer}`} src={template.assets.foreground.src} alt="" aria-hidden="true" />
          <img className={`${styles.layer} ${styles.outerLayer}`} src={template.assets.outerDoodles.src} alt="" aria-hidden="true" />
          <img className={`${styles.layer} ${styles.descriptionPaperLayer}`} src={template.assets.descriptionPaper.src} alt="" aria-hidden="true" />
          {scrapbook.description ? (
            <p className={`${styles.description} ${styles[`description${template.geometry.length}`]}`}>
              {scrapbook.description}
            </p>
          ) : null}
          {scrapbook.templateId === "one-photo" ? (
            <img
              className={styles.posterCompanion}
              src={tadaPosterCompanion.src}
              alt=""
              aria-hidden="true"
            />
          ) : null}
        </article>
      </div>

      {failedSlots.length > 0 ? (
        <div className={styles.photoNotice} role="status" aria-live="polite">
          <p>
            第 {failedSlots.map((index) => index + 1).join("、")} 张照片暂时没能打开，其他回忆都还在。
          </p>
          <button type="button" onClick={() => setFailedImages(new Set())}>重新加载照片</button>
        </div>
      ) : (
        <p className={styles.helperText}>每一张照片，都保留了送出时选好的取景。</p>
      )}

      <PrimaryButton onClick={onContinue}>继续拆礼物</PrimaryButton>
    </StageCard>
  );
}
