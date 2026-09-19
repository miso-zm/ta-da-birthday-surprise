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

type ReceiverShellProps = {
  surprise: Surprise | SurprisePreview;
  onExitPreview?: () => void;
};

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
  const advance = (expected: ReceiverStep, next: ReceiverStep) => {
    setStep((current) => (current === expected ? next : current));
  };

  const handleUnlockComplete = () => advance("unlock", "memory");
  const handleUnlockFallback = () => advance("unlock", "memory");

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
          <Share
            recipientName={surprise.recipient.displayName}
            gift={surprise.gift}
            portrait={surprise.portrait}
            onReplay={() => setStep("opening")}
            onExitPreview={isPreview ? onExitPreview : undefined}
          />
        )}
      </div>
    </main>
  );
}
