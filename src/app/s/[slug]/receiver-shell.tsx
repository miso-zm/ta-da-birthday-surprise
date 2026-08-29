"use client";

import { useState } from "react";
import type {
  ReceiverStep,
  Surprise,
  SurprisePreview,
} from "@/lib/surprise-contract";
import { hasGiftLink } from "@/lib/surprise-contract";
import { Opening } from "@/features/opening/opening";
import { UnlockGame } from "@/features/unlock/unlock-game";
import { BirthdayCard } from "@/features/memory/card/birthday-card";
import { Scrapbook } from "@/features/memory/scrapbook/scrapbook";
import { GiftReveal } from "@/features/gift/gift-reveal";
import { Share } from "@/features/share/share";
import { PrimaryButton } from "@/features/shared/placeholders";

type ReceiverShellProps = {
  surprise: Surprise | SurprisePreview;
  onExitPreview?: () => void;
};

function PreviewComplete({
  onExit,
  onReplay,
}: {
  onExit?: () => void;
  onReplay: () => void;
}) {
  return (
    <section className="w-full px-1 py-2">
      <div className="paper-surface paper-fold p-6 text-center">
        <div
          aria-hidden="true"
          className="mx-auto grid size-20 place-items-center rounded-full bg-[color-mix(in_srgb,var(--coral)_14%,white)] text-sm font-bold text-[var(--ink)]"
        >
          Ta-da!
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[var(--ink)]">
          这份惊喜已经准备好了
        </h1>
      </div>

      <PrimaryButton onClick={onExit ?? onReplay}>回去继续编辑</PrimaryButton>
      <button
        type="button"
        onClick={onReplay}
        className="mt-3 min-h-12 w-full rounded-[var(--radius-round)] border border-[var(--ui-line)] bg-[var(--paper)] px-4 text-sm font-bold text-[var(--ink)] active:translate-y-px"
      >
        再看一遍
      </button>
    </section>
  );
}

export function ReceiverShell({ surprise, onExitPreview }: ReceiverShellProps) {
  const [step, setStep] = useState<ReceiverStep>("opening");
  const hasGift = hasGiftLink(surprise.gift);
  const steps: ReceiverStep[] = surprise.unlock.kind === "none"
    ? hasGift
      ? ["opening", "memory", "gift", "share"]
      : ["opening", "memory", "share"]
    : hasGift
      ? ["opening", "unlock", "memory", "gift", "share"]
      : ["opening", "unlock", "memory", "share"];
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

  const handleUnlockComplete = () => advance("unlock", "memory");
  const handleUnlockFallback = () => advance("unlock", "memory");
  const handleShareResult = () => undefined;

  return (
    <main className="relative isolate mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-[var(--page)] px-4 pb-5 pt-4 sm:px-5">
      <header className="flex min-h-12 items-center justify-between gap-4" aria-label="惊喜流程进度">
        <div>
          {isPreview ? (
            <p className="text-[11px] font-bold tracking-wide text-[var(--coral-dark)]">本地预览</p>
          ) : null}
          <p className="text-sm font-bold">给 {surprise.recipient.displayName} 的惊喜</p>
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
            onOpen={() => advance(
              "opening",
              surprise.unlock.kind === "none" ? "memory" : "unlock",
            )}
          />
        )}
        {step === "unlock" && surprise.unlock.kind !== "none" && (
          <UnlockGame
            config={surprise.unlock}
            onComplete={handleUnlockComplete}
            onFallback={handleUnlockFallback}
          />
        )}
        {step === "memory" && surprise.memory.kind === "card" && (
          <BirthdayCard
            recipient={surprise.recipient}
            sender={surprise.sender}
            card={surprise.memory.card}
            onContinue={() => advance("memory", hasGift ? "gift" : "share")}
          />
        )}
        {step === "memory" && surprise.memory.kind === "scrapbook" && (
          <Scrapbook
            scrapbook={surprise.memory.scrapbook}
            onContinue={() => advance("memory", hasGift ? "gift" : "share")}
          />
        )}
        {step === "gift" && hasGift && (
          <GiftReveal
            gift={surprise.gift}
            onReveal={() => undefined}
            onContinue={() => advance("gift", "share")}
          />
        )}
        {step === "share" && (
          isPreview ? (
            <PreviewComplete
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
