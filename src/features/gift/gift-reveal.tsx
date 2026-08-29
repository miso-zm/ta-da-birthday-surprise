"use client";

import { useRef, useState } from "react";
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

const CONFETTI_PIECES = Array.from({ length: 6 }, (_, index) => index);

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
              <span key={piece} className={styles.confettiPiece} />
            ))}
          </div>

          <h1 className={styles.title}>礼物已经送到啦</h1>

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
