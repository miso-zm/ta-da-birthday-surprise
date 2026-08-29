"use client";

import { useEffect, useRef, useState } from "react";
import type { GiftContent } from "@/lib/surprise-contract";
import { isHttpsUrl } from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";
import styles from "./gift-reveal.module.css";

type GiftRevealProps = {
  gift: GiftContent;
  onReveal: () => void;
  onContinue: () => void;
};

type RevealPhase = "closed" | "opening" | "revealed";

export function GiftReveal({ gift, onReveal, onContinue }: GiftRevealProps) {
  const [phase, setPhase] = useState<RevealPhase>("closed");
  const timersRef = useRef<number[]>([]);
  const validUrl = isHttpsUrl(gift.externalUrl);
  const revealed = phase === "revealed";
  const opening = phase === "opening";

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const reveal = () => {
    if (phase !== "closed") {
      return;
    }

    onReveal();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("revealed");
      return;
    }

    setPhase("opening");
    timersRef.current = [
      window.setTimeout(() => setPhase("revealed"), 2600),
    ];
  };

  return (
    <StageCard label="最后一份小惊喜">
      {!revealed ? (
        <>
          <div
            className={styles.scene}
            data-opening={opening}
            role="img"
            aria-label={opening ? "礼物正在打开" : "一份还没打开的小礼物"}
          >
            <img
              src="/assets/gift/gift-box-closed-v1.png"
              alt=""
              aria-hidden="true"
              className={styles.closedBox}
            />
            <img
              src="/assets/gift/gift-box-lid-v1.png"
              alt=""
              aria-hidden="true"
              className={styles.lid}
            />
            <img
              src="/assets/gift/tada-gift-pop-v1.png"
              alt=""
              aria-hidden="true"
              className={styles.tadaPop}
            />
          </div>
          <h1 className="mt-7 text-center text-3xl font-bold tracking-[-0.04em]">还有一份小礼物</h1>
          <PrimaryButton onClick={reveal} disabled={opening}>
            {opening ? "正在拆开…" : "拆开礼物"}
          </PrimaryButton>
        </>
      ) : (
        <>
          <div className={styles.completeScene}>
            <img
              src="/assets/gift/tada-gift-reveal-complete-v2.png"
              alt="Tada 从打开的礼盒中探出头来"
            />
          </div>
          <div className="paper-surface mt-5 rounded-[var(--radius-md)] p-5 text-center">
            {validUrl ? (
              <>
                <p className="text-sm font-medium leading-6 text-[var(--muted)]">打开链接，就能去收下这份小礼物。</p>
                <a
                  href={gift.externalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-5 inline-flex min-h-12 items-center justify-center rounded-[var(--radius-round)] border-0 bg-[var(--coral-action)] px-5 font-bold text-[var(--on-dark)] shadow-[var(--shadow-pressed)] active:translate-y-px active:shadow-none"
                >
                  去收下小礼物
                </a>
              </>
            ) : (
              <p role="alert" className="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-danger)_14%,white)] px-3 py-2 text-sm font-semibold">
                礼物链接暂时打不开，你可以先继续看看。
              </p>
            )}
          </div>
          <PrimaryButton onClick={onContinue}>收好这份惊喜</PrimaryButton>
        </>
      )}
    </StageCard>
  );
}
