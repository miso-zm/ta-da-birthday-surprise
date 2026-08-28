"use client";

import { useState } from "react";
import type {
  ReceiverStep,
  Surprise,
  SurprisePreview,
} from "@/lib/surprise-contract";
import { Opening } from "@/features/opening/opening";
import { UnlockGame } from "@/features/unlock/unlock-game";
import { BirthdayCard } from "@/features/memory/card/birthday-card";
import { Scrapbook } from "@/features/memory/scrapbook/scrapbook";
import { GiftReveal } from "@/features/gift/gift-reveal";
import { Share } from "@/features/share/share";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";

const steps: ReceiverStep[] = ["opening", "unlock", "card", "scrapbook", "gift", "share"];

type ReceiverShellProps = {
  surprise: Surprise | SurprisePreview;
  onExitPreview?: () => void;
};

function PreviewComplete({
  surprise,
  onExit,
  onReplay,
}: {
  surprise: SurprisePreview;
  onExit?: () => void;
  onReplay: () => void;
}) {
  return (
    <StageCard label="Receiver Preview 已完成">
      <div className="rounded-[26px] border-2 border-[var(--line)] bg-[#fff5df] p-6 text-center shadow-[0_5px_0_var(--line)]">
        <div
          aria-hidden="true"
          className="mx-auto grid size-20 place-items-center rounded-[45%_55%_48%_52%] border-2 border-[var(--line)] bg-[var(--paper)] text-sm font-black text-[var(--line)]"
        >
          Ta-da!
        </div>
        <p className="mt-5 text-xs font-black tracking-wide text-[var(--coral-dark)]">
          六段体验全部走通
        </p>
        <h1 className="mt-2 text-2xl font-black text-[var(--ink)]">
          这份惊喜已经准备好预览啦
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
          当前只是本地预览，不会生成假的公开分享链接。正式发布功能会在数据层阶段接入。
        </p>
      </div>

      <div className="mt-4 rounded-[20px] border-2 border-dashed border-[color-mix(in_srgb,var(--line)_45%,transparent)] bg-[var(--paper)] p-4">
        <p className="text-xs font-black text-[var(--coral-dark)]">未来分享卡片文案</p>
        <p className="mt-2 font-black text-[var(--ink)]">{surprise.share.title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">{surprise.share.text}</p>
      </div>

      <PrimaryButton onClick={onExit ?? onReplay}>返回继续编辑</PrimaryButton>
      <button
        type="button"
        onClick={onReplay}
        className="mt-3 min-h-12 w-full rounded-[16px] border-2 border-[var(--line)] bg-[var(--paper)] px-4 text-sm font-black text-[var(--ink)] shadow-[0_3px_0_var(--line)] active:translate-y-[3px] active:shadow-none"
      >
        从头再看一次
      </button>
    </StageCard>
  );
}

export function ReceiverShell({ surprise, onExitPreview }: ReceiverShellProps) {
  const [step, setStep] = useState<ReceiverStep>("opening");
  const currentIndex = steps.indexOf(step);
  const isPreview = "mode" in surprise && surprise.mode === "preview";
  const publishedShareUrl = "slug" in surprise
    ? typeof window === "undefined"
      ? `/s/${surprise.slug}`
      : window.location.href
    : "";

  const advance = (expected: ReceiverStep, next: ReceiverStep) => {
    setStep((current) => (current === expected ? next : current));
  };

  const handleUnlockComplete = () => advance("unlock", "card");
  const handleUnlockFallback = () => advance("unlock", "card");
  const handleShareResult = () => undefined;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-4 pb-5 pt-4 sm:px-5">
      <header className="flex min-h-12 items-center justify-between gap-4" aria-label="惊喜流程进度">
        <div>
          {isPreview ? (
            <p className="text-[11px] font-black tracking-wide text-[var(--coral-dark)]">RECEIVER PREVIEW</p>
          ) : null}
          <p className="text-sm font-black">给 {surprise.recipient.displayName} 的惊喜</p>
        </div>
        <p className="text-xs font-bold text-[var(--muted)]" aria-live="polite">
          {currentIndex + 1} / {steps.length}
        </p>
      </header>

      <div className="flex flex-1 items-center py-4">
        {step === "opening" && (
          <Opening
            recipient={surprise.recipient}
            sender={surprise.sender}
            opening={surprise.opening}
            onOpen={() => advance("opening", "unlock")}
          />
        )}
        {step === "unlock" && (
          <UnlockGame
            config={surprise.unlock}
            onComplete={handleUnlockComplete}
            onFallback={handleUnlockFallback}
          />
        )}
        {step === "card" && (
          <BirthdayCard
            recipient={surprise.recipient}
            sender={surprise.sender}
            card={surprise.card}
            onContinue={() => advance("card", "scrapbook")}
          />
        )}
        {step === "scrapbook" && (
          <Scrapbook
            scrapbook={surprise.scrapbook}
            onContinue={() => advance("scrapbook", "gift")}
          />
        )}
        {step === "gift" && (
          <GiftReveal
            gift={surprise.gift}
            onReveal={() => undefined}
            onContinue={() => advance("gift", "share")}
          />
        )}
        {step === "share" && (
          isPreview ? (
            <PreviewComplete
              surprise={surprise}
              onExit={onExitPreview}
              onReplay={() => setStep("opening")}
            />
          ) : (
            <Share
              url={publishedShareUrl}
              title={surprise.share.title}
              text={surprise.share.text}
              onResult={handleShareResult}
              onReplay={() => setStep("opening")}
            />
          )
        )}
      </div>
    </main>
  );
}
