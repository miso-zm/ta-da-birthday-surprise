"use client";

import { useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import type { GiftContent } from "@/lib/surprise-contract";
import { isHttpsUrl } from "@/lib/surprise-contract";
import { PrimaryButton } from "@/features/shared/placeholders";
import {
  getGiftLinkPlatform,
  type GiftLinkPlatformId,
} from "./gift-link-platform";
import styles from "./gift-reveal.module.css";

type GiftRevealProps = {
  gift: GiftContent;
  onReveal: () => void;
  onContinue: () => void;
};

type ConfettiPiece = {
  color: string;
  delay: number;
  duration: number;
  endX: number;
  endY: number;
  endTurn: number;
  height: number;
  left: number;
  midX: number;
  midY: number;
  midTurn: number;
  shape: "dot" | "star" | "strip";
  startY: number;
  width: number;
};

type ConfettiStyle = CSSProperties & {
  "--confetti-color": string;
  "--confetti-delay": string;
  "--confetti-duration": string;
  "--confetti-end-x": string;
  "--confetti-end-y": string;
  "--confetti-end-turn": string;
  "--confetti-height": string;
  "--confetti-left": string;
  "--confetti-mid-x": string;
  "--confetti-mid-y": string;
  "--confetti-mid-turn": string;
  "--confetti-start-y": string;
  "--confetti-width": string;
};

const CONFETTI_PIECES: ConfettiPiece[] = [
  { left: 5, startY: -80, midX: -8, midY: 22, endX: 12, endY: 72, midTurn: -58, endTurn: 176, delay: 0, duration: 2140, width: 10, height: 15, color: "#fa907b", shape: "strip" },
  { left: 11, startY: -160, midX: 11, midY: 26, endX: -15, endY: 86, midTurn: 42, endTurn: -154, delay: 240, duration: 1880, width: 12, height: 12, color: "#ffbe3d", shape: "dot" },
  { left: 17, startY: -46, midX: -13, midY: 18, endX: 9, endY: 64, midTurn: -72, endTurn: 208, delay: 80, duration: 2360, width: 11, height: 17, color: "#7ed9c8", shape: "strip" },
  { left: 23, startY: -198, midX: 9, midY: 28, endX: -18, endY: 90, midTurn: 54, endTurn: -228, delay: 520, duration: 2020, width: 13, height: 16, color: "#a8d8ff", shape: "strip" },
  { left: 30, startY: -112, midX: -10, midY: 23, endX: 16, endY: 76, midTurn: -44, endTurn: 162, delay: 160, duration: 2480, width: 13, height: 13, color: "#c7b1ff", shape: "dot" },
  { left: 36, startY: -64, midX: 14, midY: 27, endX: -11, endY: 82, midTurn: 68, endTurn: -196, delay: 400, duration: 2200, width: 12, height: 16, color: "#fa907b", shape: "strip" },
  { left: 42, startY: -142, midX: -9, midY: 20, endX: 18, endY: 68, midTurn: -38, endTurn: 138, delay: 600, duration: 1920, width: 18, height: 18, color: "#ffbe3d", shape: "star" },
  { left: 48, startY: -184, midX: 12, midY: 30, endX: -20, endY: 88, midTurn: 76, endTurn: -244, delay: 40, duration: 2420, width: 10, height: 17, color: "#7ed9c8", shape: "strip" },
  { left: 54, startY: -94, midX: -11, midY: 24, endX: 14, endY: 74, midTurn: -52, endTurn: 188, delay: 320, duration: 2050, width: 11, height: 11, color: "#a8d8ff", shape: "dot" },
  { left: 60, startY: -40, midX: 8, midY: 25, endX: -16, endY: 84, midTurn: 48, endTurn: -212, delay: 120, duration: 2310, width: 13, height: 16, color: "#c7b1ff", shape: "strip" },
  { left: 66, startY: -176, midX: -14, midY: 18, endX: 10, endY: 60, midTurn: -64, endTurn: 198, delay: 560, duration: 1840, width: 10, height: 14, color: "#fa907b", shape: "strip" },
  { left: 72, startY: -126, midX: 10, midY: 29, endX: -19, endY: 90, midTurn: 58, endTurn: -236, delay: 200, duration: 2500, width: 12, height: 17, color: "#ffbe3d", shape: "strip" },
  { left: 78, startY: -72, midX: -8, midY: 24, endX: 15, endY: 78, midTurn: -36, endTurn: 148, delay: 460, duration: 2180, width: 14, height: 14, color: "#7ed9c8", shape: "dot" },
  { left: 83, startY: -200, midX: 13, midY: 21, endX: -12, endY: 70, midTurn: 72, endTurn: -184, delay: 280, duration: 1980, width: 11, height: 16, color: "#a8d8ff", shape: "strip" },
  { left: 87, startY: -104, midX: -10, midY: 28, endX: 20, endY: 87, midTurn: -46, endTurn: 172, delay: 640, duration: 2390, width: 19, height: 19, color: "#c7b1ff", shape: "star" },
  { left: 90, startY: -54, midX: 9, midY: 19, endX: -14, endY: 66, midTurn: 52, endTurn: -202, delay: 360, duration: 2100, width: 12, height: 15, color: "#fa907b", shape: "strip" },
  { left: 93, startY: -152, midX: -12, midY: 30, endX: 17, endY: 89, midTurn: -62, endTurn: 224, delay: 500, duration: 2460, width: 12, height: 12, color: "#ffbe3d", shape: "dot" },
  { left: 95, startY: -88, midX: 8, midY: 25, endX: -13, endY: 80, midTurn: 44, endTurn: -168, delay: 620, duration: 2260, width: 10, height: 16, color: "#7ed9c8", shape: "strip" },
];

function getConfettiStyle(piece: ConfettiPiece): ConfettiStyle {
  return {
    "--confetti-color": piece.color,
    "--confetti-delay": `${piece.delay}ms`,
    "--confetti-duration": `${piece.duration}ms`,
    "--confetti-end-x": `${piece.endX}px`,
    "--confetti-end-y": `${piece.endY}vh`,
    "--confetti-end-turn": `${piece.endTurn}deg`,
    "--confetti-height": `${piece.height}px`,
    "--confetti-left": `${piece.left}%`,
    "--confetti-mid-x": `${piece.midX}px`,
    "--confetti-mid-y": `${piece.midY}vh`,
    "--confetti-mid-turn": `${piece.midTurn}deg`,
    "--confetti-start-y": `${piece.startY}px`,
    "--confetti-width": `${piece.width}px`,
  };
}

function PlatformIcon({ platform }: { platform: GiftLinkPlatformId }) {
  if (platform === "taobao") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 8.25h11l-.7 10H7.2l-.7-10Z" />
        <path d="M9 9V6.8a3 3 0 0 1 6 0V9" />
        <path d="M9.2 13.1h5.6M12 10.8v4.6" />
      </svg>
    );
  }

  if (platform === "jd") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5.25 8.2 6.75-3 6.75 3v8.1l-6.75 3-6.75-3V8.2Z" />
        <path d="m5.5 8.35 6.5 3 6.5-3M12 11.35v7.5" />
        <path d="m8.65 6.7 6.55 3" />
      </svg>
    );
  }

  if (platform === "wechat-shop") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.25 9.25h13.5v9.5H5.25z" />
        <path d="m4.4 9.25 1.7-4h11.8l1.7 4M9 18.75v-5.1h6v5.1" />
        <path d="M4.4 9.25c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9.35 14.65 5.3-5.3" />
      <path d="M9.15 10.85a3.54 3.54 0 0 0-5 0L1.1 13.9a3.54 3.54 0 0 0 5 5l1-1" />
      <path d="M14.85 13.15a3.54 3.54 0 0 0 5 0l3.05-3.05a3.54 3.54 0 0 0-5-5l-1 1" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function GiftReveal({ gift, onReveal, onContinue }: GiftRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const didRevealRef = useRef(false);
  const validUrl = isHttpsUrl(gift.externalUrl);
  const platform = validUrl ? getGiftLinkPlatform(gift.externalUrl) : null;

  const reveal = () => {
    if (didRevealRef.current) {
      return;
    }

    didRevealRef.current = true;
    onReveal();
    setRevealed(true);
  };

  return (
    <section className={styles.reveal}>
      {!revealed ? (
        <div className={styles.preopen}>
          <Image
            src="/assets/gift/gift-preopen-hero-v1.png"
            alt="Tada 站在一份珊瑚色礼盒旁，把礼物送到啦"
            width={1086}
            height={1448}
            className={styles.preopenHero}
          />
          <PrimaryButton onClick={reveal}>拆开礼物</PrimaryButton>
        </div>
      ) : (
        <div className={styles.receipt}>
          <div className={styles.confettiBurst} aria-hidden="true">
            {CONFETTI_PIECES.map((piece) => (
              <span
                key={`${piece.left}-${piece.delay}`}
                className={styles.confettiPiece}
                data-shape={piece.shape}
                style={getConfettiStyle(piece)}
              />
            ))}
          </div>

          <h1 className={styles.title}>
            <Image
              src="/assets/gift/gift-receipt-title-v1.png"
              alt="礼物已经送到啦"
              width={2094}
              height={663}
              className={styles.receiptTitle}
              priority
            />
          </h1>

          <Image
            src="/assets/gift/tada-gift-receipt-hero-v1.png"
            alt="Tada 从打开的珊瑚色礼盒中探出头，四周飘着彩纸"
            width={954}
            height={713}
            className={styles.receiptHero}
          />

          <div className={styles.linkSection}>
            <p className={styles.linkLabel}>礼物领取链接</p>
            {platform ? (
              <a
                href={platform.url}
                target="_blank"
                rel="noreferrer noopener"
                className={styles.platformCard}
                aria-label={`打开${platform.name}礼物领取链接（新窗口）`}
              >
                <span className={styles.platformIcon} data-platform={platform.id}>
                  <PlatformIcon platform={platform.id} />
                </span>
                <span className={styles.platformText}>
                  <strong>{platform.name}</strong>
                  <span>{platform.domain}</span>
                </span>
                <span className={styles.arrowIcon}>
                  <ArrowIcon />
                </span>
              </a>
            ) : (
              <div className={styles.platformCard} aria-disabled="true">
                <span className={styles.platformIcon} data-platform="generic">
                  <PlatformIcon platform="generic" />
                </span>
                <span className={styles.platformText} role="alert">
                  <strong>礼物链接暂时不可用</strong>
                  <span>请联系送礼人</span>
                </span>
              </div>
            )}
          </div>

          <PrimaryButton onClick={onContinue}>收好礼物</PrimaryButton>
        </div>
      )}
    </section>
  );
}
