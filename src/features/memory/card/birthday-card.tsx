"use client";

import Image from "next/image";
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
import { LetterCardContent } from "./letter-card-content";
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
  const regionClass = density === "short"
    ? styles.messageRegionShort
    : density === "medium"
      ? styles.messageRegionMedium
      : density === "long"
        ? styles.messageRegionLong
        : styles.messageRegionMaximum;

  return (
    <article
      className={styles.letterCard}
      aria-label={`给 ${recipientName} 的手写生日信`}
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
      <LetterCardContent
        recipientName={recipientName}
        message={message}
        signature={signature}
        recipientClassName={`${styles.handwriting} ${styles.recipient} ${recipientIsCompact ? styles.recipientCompact : ""}`}
        messageRegionClassName={`${styles.messageRegion} ${regionClass}`}
        messageClassName={`${styles.handwriting} ${styles.message} ${getMessageClass(density)}`}
        signatureClassName={`${styles.handwriting} ${styles.signature} ${signatureIsCompact ? styles.signatureCompact : ""} ${density === "long" ? styles.signatureLong : ""} ${density === "maximum" ? styles.signatureMaximum : ""}`}
      />
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
      <LetterCardContent
        recipientName={recipientName}
        message={message}
        signature={signature}
        recipientClassName={`${styles.handwriting} ${styles.creamRecipient} ${recipientIsCompact ? styles.creamRecipientCompact : ""}`}
        messageRegionClassName={`${styles.creamMessageRegion} ${density === "long" ? styles.creamMessageRegionLong : ""} ${density === "maximum" ? styles.creamMessageRegionMaximum : ""}`}
        messageClassName={`${styles.handwriting} ${styles.creamMessage} ${getMessageClass(density)}`}
        signatureClassName={`${styles.handwriting} ${styles.creamSignature} ${signatureIsCompact ? styles.creamSignatureCompact : ""} ${density === "long" ? styles.creamSignatureLong : ""} ${density === "maximum" ? styles.creamSignatureMaximum : ""}`}
      />
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
      <PrimaryButton onClick={onContinue}>继续拆礼物</PrimaryButton>
    </StageCard>
  );
}
