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
    setRevealed(true);
    onReveal();
  };

  return (
    <StageCard label="Gift Reveal 占位模块">
      {!revealed ? (
        <>
          <div className="mx-auto mt-8 grid size-44 place-items-center rounded-[28px] border-2 border-[var(--line)] bg-[var(--coral)] text-center text-2xl font-black text-white shadow-[0_6px_0_var(--line)]">礼物占位图</div>
          <h1 className="mt-7 text-center text-3xl font-black tracking-[-0.04em]">最后一个惊喜</h1>
          <PrimaryButton onClick={reveal}>打开礼物</PrimaryButton>
        </>
      ) : (
        <>
          <div className="mt-5 rounded-[22px] border-2 border-[var(--line)] bg-[#fff9e8] p-5 text-center">
            <p className="text-xs font-black text-[var(--coral-dark)]">礼物已打开</p>
            <h1 className="mt-3 text-2xl font-black leading-tight">{gift.title}</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">{gift.description}</p>
            {validUrl ? (
              <a href={gift.externalUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-[18px] border-2 border-[var(--line)] bg-[var(--butter)] px-5 font-extrabold shadow-[0_4px_0_var(--line)] active:translate-y-1 active:shadow-none">
                查看外部礼物
              </a>
            ) : (
              <p role="alert" className="mt-5 rounded-[14px] bg-[#f7e2dd] px-3 py-2 text-sm font-bold">礼物链接不是有效的 HTTPS 地址。</p>
            )}
          </div>
          <PrimaryButton onClick={onContinue}>保存这份惊喜</PrimaryButton>
        </>
      )}
    </StageCard>
  );
}
