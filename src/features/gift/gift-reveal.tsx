"use client";

import { useState } from "react";
import type { GiftContent } from "@/lib/surprise-contract";
import { isHttpsUrl } from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";

type GiftRevealProps = {
  gift: GiftContent;
  onReveal: () => void;
  onContinue: () => void;
};

export function GiftReveal({ gift, onReveal, onContinue }: GiftRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const validUrl = isHttpsUrl(gift.externalUrl);

  const reveal = () => {
    if (revealed) {
      return;
    }

    setRevealed(true);
    onReveal();
  };

  return (
    <StageCard label="最后一份小惊喜">
      {!revealed ? (
        <>
          <div className="paper-surface mx-auto mt-8 grid size-44 place-items-center text-center text-2xl font-bold text-[var(--ink)]">Ta-da!</div>
          <h1 className="mt-7 text-center text-3xl font-bold tracking-[-0.04em]">还有一份小礼物</h1>
          <PrimaryButton onClick={reveal}>拆开礼物</PrimaryButton>
        </>
      ) : (
        <>
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
