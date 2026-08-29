"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { CardContent, Person } from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";
import letterCardArtwork from "./assets/letter-card-background.png";
import styles from "./birthday-card.module.css";

type BirthdayCardProps = {
  recipient: Person;
  sender: Person;
  card: CardContent;
  onContinue: () => void;
};

type CardTemplate = "coral-birthday" | "cream-wishes";

function resolveTemplate(templateId: string): CardTemplate {
  return templateId === "cream-wishes" ? "cream-wishes" : "coral-birthday";
}

function TadaLetterPlaceholder() {
  return (
    <div
      className="mb-4 flex min-h-16 items-center gap-3 rounded-[18px] border-2 border-dashed border-[color-mix(in_srgb,var(--line)_58%,transparent)] bg-[#fffaf0] px-4 py-3"
      role="img"
      aria-label="Tada 正在递出一封生日信"
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--line)] bg-[#f8e9cc] text-[10px] font-black tracking-[0.08em] text-[var(--line)]"
        aria-hidden="true"
      >
        Tada
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-[var(--ink)]">Tada 递来一封信</p>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-[var(--muted)]">这封信已经为你准备好啦</p>
      </div>
    </div>
  );
}

type CardTemplateProps = {
  recipientName: string;
  senderName: string;
  signature: string;
  message: string;
};

type MessageDensity = "short" | "medium" | "long" | "maximum";

function countVisibleCharacters(value: string): number {
  return Array.from(value.replace(/\s/g, "")).length;
}

function getMessageDensity(message: string): MessageDensity {
  const length = countVisibleCharacters(message);
  if (length <= 45) return "short";
  if (length <= 95) return "medium";
  if (length <= 150) return "long";
  return "maximum";
}

function getMessageClass(density: MessageDensity): string {
  if (density === "short") return styles.messageShort;
  if (density === "medium") return styles.messageMedium;
  if (density === "long") return styles.messageLong;
  return styles.messageMaximum;
}

function LetterCard({ recipientName, signature, message }: Omit<CardTemplateProps, "senderName">) {
  const density = getMessageDensity(message);
  const recipientIsCompact = countVisibleCharacters(recipientName) > 12;
  const signatureIsCompact = countVisibleCharacters(signature) > 12;
  const [isFontReady, setIsFontReady] = useState(false);
  const fontSample = `给 ${recipientName}${message}${signature}`;
  const regionClass = density === "short"
    ? styles.messageRegionShort
    : density === "medium"
      ? styles.messageRegionMedium
      : density === "maximum"
        ? styles.messageRegionMaximum
        : "";

  useEffect(() => {
    let isActive = true;

    if (!document.fonts) {
      Promise.resolve().then(() => {
        if (isActive) setIsFontReady(true);
      });
      return () => {
        isActive = false;
      };
    }

    document.fonts.load('300 16px "NaikaiCard"', fontSample).then(
      () => {
        if (isActive) setIsFontReady(true);
      },
      () => {
        if (isActive) setIsFontReady(true);
      },
    );

    return () => {
      isActive = false;
    };
  }, [fontSample]);

  const pendingClass = isFontReady ? "" : styles.handwritingPending;

  return (
    <article
      className={styles.letterCard}
      aria-label={`给 ${recipientName} 的手写生日信`}
      aria-busy={!isFontReady}
    >
      <Image
        src={letterCardArtwork}
        alt=""
        fill
        sizes="(max-width: 430px) 100vw, 378px"
        className={styles.letterArtwork}
        aria-hidden="true"
        draggable={false}
        priority
      />
      <p className={`${styles.handwriting} ${pendingClass} ${styles.recipient} ${recipientIsCompact ? styles.recipientCompact : ""}`}>
        给 {recipientName}
      </p>
      <div className={`${styles.messageRegion} ${regionClass}`}>
        <p className={`${styles.handwriting} ${pendingClass} ${styles.message} ${getMessageClass(density)}`}>
          {message}
        </p>
      </div>
      <p className={`${styles.handwriting} ${pendingClass} ${styles.signature} ${signatureIsCompact ? styles.signatureCompact : ""} ${density === "maximum" ? styles.signatureMaximum : ""}`}>
        {signature}
      </p>
    </article>
  );
}

function CreamWishesCard({ recipientName, senderName, signature, message }: CardTemplateProps) {
  return (
    <article
      className="relative min-h-[430px] overflow-hidden rounded-[26px] border-[3px] border-[var(--line)] bg-[#fff9e9] px-6 py-7 shadow-[0_6px_0_#d8c99c]"
      aria-label="暖奶油许愿贺卡"
    >
      <div className="absolute inset-x-5 top-5 h-3 rounded-full border-2 border-[var(--line)] bg-[var(--sage)]" aria-hidden="true" />
      <div className="absolute -right-5 bottom-16 h-24 w-12 rounded-l-full border-[3px] border-r-0 border-[var(--line)] bg-[#d9ebdf]" aria-hidden="true" />
      <div className="absolute -left-5 top-32 h-24 w-12 rounded-r-full border-[3px] border-l-0 border-[var(--line)] bg-[var(--butter)]" aria-hidden="true" />

      <div className="relative z-10 flex min-h-[368px] flex-col pt-5">
        <header className="text-center">
          <p className="text-xs font-black tracking-[0.16em] text-[var(--muted)]">A LITTLE WISH FOR</p>
          <h1 className="mt-2 break-words text-[34px] font-black leading-tight tracking-[-0.05em] text-[var(--ink)] [overflow-wrap:anywhere]">{recipientName}</h1>
          <div className="mx-auto mt-3 flex w-fit items-center gap-2" aria-hidden="true">
            <span className="h-[3px] w-9 rounded-full bg-[var(--coral)]" />
            <span className="size-2 rotate-45 rounded-[2px] border border-[var(--line)] bg-[var(--butter)]" />
            <span className="h-[3px] w-9 rounded-full bg-[var(--coral)]" />
          </div>
        </header>

        <p className="mt-8 whitespace-pre-wrap break-words text-center text-[15px] font-semibold leading-7 text-[var(--ink)] [overflow-wrap:anywhere]">
          {message}
        </p>

        <footer className="mt-auto pt-8 text-center">
          <p className="text-xs font-bold text-[var(--muted)]">来自 {senderName} 的生日愿望</p>
          <p className="mt-1 text-lg font-black text-[var(--coral-dark)]">{signature}</p>
        </footer>
      </div>
    </article>
  );
}

export function BirthdayCard({ recipient, sender, card, onContinue }: BirthdayCardProps) {
  const template = resolveTemplate(card.templateId);
  const recipientName = recipient.displayName.trim() || "亲爱的你";
  const senderName = sender.displayName.trim() || "在乎你的人";
  const signature = card.signature.trim() || senderName;

  return (
    <StageCard label={template === "coral-birthday" ? "递到你手里的信" : "一封暖奶油许愿信"}>
      {template === "cream-wishes" ? <TadaLetterPlaceholder /> : null}
      {template === "coral-birthday" ? (
        <LetterCard
          key={`${recipientName}\u0000${card.message}\u0000${signature}`}
          recipientName={recipientName}
          signature={signature}
          message={card.message}
        />
      ) : (
        <CreamWishesCard recipientName={recipientName} senderName={senderName} signature={signature} message={card.message} />
      )}
      <PrimaryButton onClick={onContinue}>继续看我们的回忆</PrimaryButton>
    </StageCard>
  );
}
