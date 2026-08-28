"use client";

import { useState } from "react";
import type { ScrapbookContent, ScrapbookSlot } from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";

type ScrapbookProps = {
  scrapbook: ScrapbookContent;
  onContinue: () => void;
};

type ScrapbookTemplate = "three-memories" | "postcard-collage";

function resolveTemplate(templateId: string): ScrapbookTemplate {
  return templateId === "postcard-collage" ? "postcard-collage" : "three-memories";
}

function normalizeSlots(slots: ScrapbookSlot[]): ScrapbookSlot[] {
  if (slots.length > 0) {
    return slots.slice(0, 3);
  }

  return [{ id: "memory-placeholder", caption: "把珍贵的一刻放在这里" }];
}

function PhotoPlaceholder({ index }: { index: number }) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-[12px] bg-[#f4ead9] px-2 text-center text-[var(--muted)]">
      <svg className="size-9" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="5" y="7" width="38" height="34" rx="6" fill="#FFFDF7" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="17" cy="18" r="4" fill="#F2B7AD" stroke="currentColor" strokeWidth="2" />
        <path d="M10 35l9-9 6 6 5-5 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="mt-1 text-[11px] font-bold leading-4">回忆照片 {index + 1}</span>
    </div>
  );
}

function TadaAlbumPlaceholder() {
  return (
    <div
      className="mb-4 flex min-h-16 items-center gap-3 rounded-[18px] border-2 border-dashed border-[color-mix(in_srgb,var(--line)_58%,transparent)] bg-[#fffaf0] px-4 py-3"
      role="img"
      aria-label="Tada 从相册后探头整理照片"
    >
      <span className="relative flex size-10 shrink-0 items-end justify-center overflow-hidden rounded-[12px] border-2 border-[var(--line)] bg-[#dcebdc]" aria-hidden="true">
        <span className="mb-[-8px] size-8 rounded-full border-2 border-[var(--line)] bg-[#fff4dc]" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-[var(--ink)]">Tada 在整理照片</p>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-[var(--muted)]">把快乐的瞬间排好啦</p>
      </div>
    </div>
  );
}

function getThreeMemoriesClass(slotCount: number, index: number): string {
  if (slotCount === 1) return "col-span-2 row-span-2";
  if (slotCount === 2) return "row-span-2";
  return index === 0 ? "row-span-2" : "";
}

function getPostcardClass(slotCount: number, index: number): string {
  if (slotCount === 1) return "col-span-2 row-span-2 mx-3 my-1 rotate-[-1deg]";
  if (slotCount === 2) return `${index === 0 ? "mr-1 rotate-[-1deg]" : "ml-1 mt-4 rotate-[1deg]"} row-span-2`;
  return index === 2 ? "col-span-2 mx-5 rotate-[-1deg]" : index === 0 ? "rotate-[-1deg]" : "rotate-[1deg]";
}

function MemoryPhoto({
  slot,
  index,
  className,
  failedImages,
  onImageError,
  variant,
}: {
  slot: ScrapbookSlot;
  index: number;
  className: string;
  failedImages: Record<string, true>;
  onImageError: (key: string) => void;
  variant: ScrapbookTemplate;
}) {
  const imageKey = `${slot.id}:${slot.imageUrl ?? ""}`;
  const showImage = Boolean(slot.imageUrl) && !failedImages[imageKey];
  const caption = slot.caption.trim() || `第 ${index + 1} 段回忆`;

  return (
    <figure
      className={`${className} flex min-h-0 flex-col border-2 border-[var(--line)] bg-[var(--paper)] p-2 ${variant === "postcard-collage" ? "rounded-[10px] shadow-[3px_4px_0_#c9ae83]" : "rounded-[18px] shadow-[0_3px_0_#cbb49d]"}`}
    >
      <div className="min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[color-mix(in_srgb,var(--line)_24%,transparent)]">
        {showImage ? (
          <img
            src={slot.imageUrl}
            alt={`${caption}的回忆照片`}
            className="h-full w-full object-cover"
            onError={() => onImageError(imageKey)}
          />
        ) : (
          <PhotoPlaceholder index={index} />
        )}
      </div>
      <figcaption className="break-words px-1 pb-0.5 pt-2 text-center text-[11px] font-bold leading-4 text-[var(--ink)] [overflow-wrap:anywhere]">
        {caption}
      </figcaption>
    </figure>
  );
}

export function Scrapbook({ scrapbook, onContinue }: ScrapbookProps) {
  const template = resolveTemplate(scrapbook.templateId);
  const slots = normalizeSlots(scrapbook.slots);
  const [failedImages, setFailedImages] = useState<Record<string, true>>({});
  const isPostcard = template === "postcard-collage";

  const markImageFailed = (key: string) => {
    setFailedImages((current) => ({ ...current, [key]: true }));
  };

  return (
    <StageCard label={isPostcard ? "一页暖阳明信片" : "一本三段回忆册"}>
      <TadaAlbumPlaceholder />
      <article
        className={`relative aspect-[3/4] overflow-hidden rounded-[26px] border-[3px] border-[var(--line)] p-4 ${isPostcard ? "bg-[#f9edcf] shadow-[0_6px_0_#cdb98e]" : "bg-[#e9f1df] shadow-[0_6px_0_#b4c4a0]"}`}
        aria-label={isPostcard ? "暖阳明信片拼贴模板" : "三段回忆固定模板"}
      >
        {isPostcard ? (
          <>
            <div className="absolute -right-6 top-4 size-20 rounded-full border-[3px] border-[var(--line)] bg-[var(--butter)] opacity-70" aria-hidden="true" />
            <div className="absolute bottom-3 left-4 h-3 w-24 rotate-[-4deg] rounded-sm bg-[color-mix(in_srgb,var(--coral)_58%,transparent)]" aria-hidden="true" />
          </>
        ) : (
          <>
            <div className="absolute -left-4 top-20 size-12 rounded-full border-[3px] border-[var(--line)] bg-[var(--pink)]" aria-hidden="true" />
            <div className="absolute -right-3 bottom-16 size-10 rotate-12 rounded-[10px] border-[3px] border-[var(--line)] bg-[var(--sky)]" aria-hidden="true" />
          </>
        )}

        <header className="relative z-10 flex h-[100px] items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.14em] text-[var(--coral-dark)]">
              {isPostcard ? "POSTCARDS FROM US" : "OUR LITTLE MOMENTS"}
            </p>
            <h1 className="mt-1 break-words text-[clamp(16px,4.8vw,21px)] font-black leading-[1.12] tracking-[-0.04em] text-[var(--ink)] [overflow-wrap:anywhere]">
              {scrapbook.title || "我们的快乐碎片"}
            </h1>
          </div>
          <span className="shrink-0 rounded-[12px] border-2 border-[var(--line)] bg-[var(--paper)] px-2 py-1 text-[10px] font-black text-[var(--muted)]">
            {slots.length} 张
          </span>
        </header>

        <div className="relative z-10 grid h-[calc(100%_-_100px)] grid-cols-2 grid-rows-2 gap-2.5" aria-label="回忆照片列表">
          {slots.map((slot, index) => (
            <MemoryPhoto
              key={`${slot.id}-${index}`}
              slot={slot}
              index={index}
              className={isPostcard ? getPostcardClass(slots.length, index) : getThreeMemoriesClass(slots.length, index)}
              failedImages={failedImages}
              onImageError={markImageFailed}
              variant={template}
            />
          ))}
        </div>
      </article>
      <p className="mt-4 text-center text-sm font-semibold leading-6 text-[var(--muted)]">
        每一格，都是想和你继续收藏的日子。
      </p>
      <PrimaryButton onClick={onContinue}>继续拆礼物</PrimaryButton>
    </StageCard>
  );
}
