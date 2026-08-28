"use client";

import { useState } from "react";
import type { ReceiverStep, Surprise } from "@/lib/surprise-contract";
import { Opening } from "@/features/opening/opening";
import { UnlockGame } from "@/features/unlock/unlock-game";
import { BirthdayCard } from "@/features/memory/card/birthday-card";
import { Scrapbook } from "@/features/memory/scrapbook/scrapbook";
import { GiftReveal } from "@/features/gift/gift-reveal";
import { Share } from "@/features/share/share";

const steps: ReceiverStep[] = ["opening", "unlock", "card", "scrapbook", "gift", "share"];

export function ReceiverShell({ surprise }: { surprise: Surprise }) {
  const [step, setStep] = useState<ReceiverStep>("opening");
  const currentIndex = steps.indexOf(step);

  const advance = (expected: ReceiverStep, next: ReceiverStep) => {
    setStep((current) => (current === expected ? next : current));
  };

  const handleUnlockComplete = () => advance("unlock", "card");
  const handleUnlockFallback = () => advance("unlock", "card");
  const handleShareResult = () => undefined;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-4 pb-5 pt-4 sm:px-5">
      <header className="flex min-h-12 items-center justify-between gap-4" aria-label="惊喜流程进度">
        <p className="text-sm font-black">给 {surprise.recipient.displayName} 的惊喜</p>
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
          <Share
            url={typeof window === "undefined" ? `/s/${surprise.slug}` : window.location.href}
            title={surprise.share.title}
            text={surprise.share.text}
            onResult={handleShareResult}
            onReplay={() => setStep("opening")}
          />
        )}
      </div>
    </main>
  );
}
