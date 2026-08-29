"use client";

import { useState } from "react";
import type { ScrapbookContent, ScrapbookPhotoTransform, ScrapbookSlot } from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";
import styles from "./scrapbook.module.css";

type ScrapbookProps = { scrapbook: ScrapbookContent; onContinue: () => void };

function photoTransformStyle(transform: ScrapbookPhotoTransform) {
  const maxOffset = ((transform.scale - 1) / transform.scale) * 50;
  return { transform: `translate(${transform.x * maxOffset}%, ${transform.y * maxOffset}%) scale(${transform.scale})` };
}

function PhotoPlaceholder({ index }: { index: number }) {
  return <div className={styles.photoPlaceholder}><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="5" y="7" width="38" height="34" rx="6" fill="#FFFDF7" stroke="currentColor" strokeWidth="2.5" /><circle cx="17" cy="18" r="4" fill="#F2B7AD" stroke="currentColor" strokeWidth="2" /><path d="M10 35l9-9 6 6 5-5 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>照片 {index + 1}</span></div>;
}

function MemoryPhoto({ slot, index, failedImages, onImageError }: { slot: ScrapbookSlot; index: number; failedImages: Record<string, true>; onImageError: (key: string) => void }) {
  const imageKey = `${slot.id}:${slot.imageUrl ?? ""}`;
  const showImage = Boolean(slot.imageUrl) && !failedImages[imageKey];
  return (
    <figure className={`${styles.photoFrame} ${styles[`photo${index}`] ?? ""}`}>
      <div className={styles.photoInner}>
        {showImage ? <img src={slot.imageUrl} alt={`第 ${index + 1} 张回忆照片`} className={styles.photoImage} style={photoTransformStyle(slot.transform)} onError={() => onImageError(imageKey)} /> : <PhotoPlaceholder index={index} />}
      </div>
    </figure>
  );
}

function PaperDecorations() {
  return <div className={styles.decorations} aria-hidden="true"><span className={`${styles.star} ${styles.starCoral}`}>✦</span><span className={`${styles.star} ${styles.starYellow}`}>✦</span><span className={`${styles.star} ${styles.starMint}`}>✦</span><span className={`${styles.paperScrap} ${styles.paperCoral}`} /><span className={`${styles.paperScrap} ${styles.paperMint}`} /><span className={styles.doodle}>⌒</span></div>;
}

export function Scrapbook({ scrapbook, onContinue }: ScrapbookProps) {
  const [failedImages, setFailedImages] = useState<Record<string, true>>({});
  const markImageFailed = (key: string) => setFailedImages((current) => ({ ...current, [key]: true }));
  return (
    <StageCard label="翻开这页回忆">
      <article className={`${styles.scrapbookPage} ${styles[scrapbook.templateId]}`} aria-label={`${scrapbook.slots.length} 张照片的回忆手帐`}>
        <PaperDecorations />
        <div className={styles.photoLayer} aria-label="回忆照片">{scrapbook.slots.map((slot, index) => <MemoryPhoto key={`${slot.id}-${index}`} slot={slot} index={index} failedImages={failedImages} onImageError={markImageFailed} />)}</div>
        <div className={styles.commonDescription} aria-label={scrapbook.description ? `共同回忆说明：${scrapbook.description}` : "共同回忆说明为空"}><p>{scrapbook.description}</p></div>
      </article>
      <p className="mt-4 text-center text-sm font-semibold leading-6 text-[var(--muted)]">每一格，都是想和你继续收藏的日子。</p>
      <PrimaryButton onClick={onContinue}>继续拆礼物</PrimaryButton>
    </StageCard>
  );
}
