"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { CardContent, Person } from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";
import letterCardArtwork from "./assets/letter-card-background.png";
import creamWishesArtwork from "./assets/cream-wishes-background.png";
import {
  getMessageDensity,
  needsCompactName,
  resolveCardTemplate,
  type MessageDensity,
} from "./birthday-card-logic";
import styles from "./birthday-card.module.css";

type BirthdayCardProps = {
  recipient: Person;
  sender: Person;
  card: CardContent;
  onContinue: () => void;
};

type CardTemplateProps = {
  recipientName: string;
  senderName: string;
  signature: string;
  message: string;
};

function getMessageClass(density: MessageDensity): string {
  if (density === "short") return styles.messageShort;
  if (density === "medium") return styles.messageMedium;
  if (density === "long") return styles.messageLong;
  return styles.messageMaximum;
}

function LetterCard({ recipientName, signature, message }: Omit<CardTemplateProps, "senderName">) {
  const density = getMessageDensity(message);
  const recipientIsCompact = needsCompactName(recipientName);
  const signatureIsCompact = needsCompactName(signature);
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

function CreamWishesCard({ recipientName, signature, message }: Omit<CardTemplateProps, "senderName">) {
  const density = getMessageDensity(message);
  const recipientIsCompact = needsCompactName(recipientName);
  const signatureIsCompact = needsCompactName(signature);

  return (
    <article
      className={styles.creamCard}
      aria-label={`给 ${recipientName} 的奶油花草生日信笺`}
    >
      <Image
        src={creamWishesArtwork}
        alt=""
        fill
        sizes="(max-width: 430px) 100vw, 378px"
        className={styles.creamArtwork}
        aria-hidden="true"
        draggable={false}
        priority
      />
      <p className={`${styles.handwriting} ${styles.creamRecipient} ${recipientIsCompact ? styles.creamRecipientCompact : ""}`}>
        给 {recipientName}
      </p>
      <div className={`${styles.creamMessageRegion} ${density === "maximum" ? styles.creamMessageRegionMaximum : ""}`}>
        <p className={`${styles.handwriting} ${styles.creamMessage} ${getMessageClass(density)}`}>
          {message}
        </p>
      </div>
      <p className={`${styles.handwriting} ${styles.creamSignature} ${signatureIsCompact ? styles.creamSignatureCompact : ""} ${density === "maximum" ? styles.creamSignatureMaximum : ""}`}>
        {signature}
      </p>
    </article>
  );
}

export function BirthdayCard({ recipient, sender, card, onContinue }: BirthdayCardProps) {
  const template = resolveCardTemplate(card.templateId);
  const recipientName = recipient.displayName.trim() || "亲爱的你";
  const senderName = sender.displayName.trim() || "在乎你的人";
  const signature = card.signature.trim() || senderName;

  return (
    <StageCard label={template === "coral-birthday" ? "Tada 递来的信" : "奶油花草信笺"}>
      {template === "coral-birthday" ? (
        <LetterCard
          recipientName={recipientName}
          signature={signature}
          message={card.message}
        />
      ) : (
        <CreamWishesCard recipientName={recipientName} signature={signature} message={card.message} />
      )}
      <PrimaryButton onClick={onContinue}>继续看我们的回忆</PrimaryButton>
    </StageCard>
  );
}
