"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  getEarliestMediaExpiry,
  mergeRefreshedMedia,
} from "@/lib/receiver-media-recovery";

type ReceiverShellProps = {
  surprise: Surprise | SurprisePreview;
  onExitPreview?: () => void;
};

export function ReceiverShell({ surprise, onExitPreview }: ReceiverShellProps) {
  const [step, setStep] = useState<ReceiverStep>("opening");
  const [currentSurprise, setCurrentSurprise] = useState(surprise);
  const [mediaRefreshing, setMediaRefreshing] = useState(false);
  const [mediaRecoveryError, setMediaRecoveryError] = useState<string>();
  const refreshInFlight = useRef<Promise<boolean> | null>(null);
  const automaticErrorAttempts = useRef(0);
  const hasGift = hasGiftLink(currentSurprise.gift);
  const steps: ReceiverStep[] = currentSurprise.unlock.kind === "none"
    ? hasGift
      ? ["opening", "memory", "gift", "share"]
      : ["opening", "memory", "share"]
    : hasGift
      ? ["opening", "unlock", "memory", "gift", "share"]
      : ["opening", "unlock", "memory", "share"];
  const currentIndex = steps.indexOf(step);
  const isPreview = "mode" in currentSurprise && currentSurprise.mode === "preview";
  const advance = (expected: ReceiverStep, next: ReceiverStep) => {
    setStep((current) => (current === expected ? next : current));
  };

  const handleUnlockComplete = () => advance("unlock", "memory");
  const handleUnlockFallback = () => advance("unlock", "memory");
  const refreshMedia = useCallback((reason: "expiry" | "error" | "manual") => {
    if (isPreview || !("slug" in currentSurprise)) return Promise.resolve(false);
    if (refreshInFlight.current) return refreshInFlight.current;
    if (reason === "error") {
      if (automaticErrorAttempts.current >= 2) {
        setMediaRecoveryError("照片暂时无法自动恢复，请手动重试。");
        return Promise.resolve(false);
      }
      automaticErrorAttempts.current += 1;
    }
    const slug = currentSurprise.slug;
    const publicationId = currentSurprise.id;
    setMediaRefreshing(true);
    const request = (async () => {
      try {
        const response = await fetch(`/api/s/${encodeURIComponent(slug)}/media`, {
          method: "POST",
          credentials: "omit",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          setMediaRecoveryError(response.status === 404 || response.status === 410
            ? "这份惊喜已经失效，照片无法重新加载。"
            : "照片暂时无法恢复，请检查网络后重试。");
          return false;
        }
        const body = await response.json() as { surprise?: Surprise };
        if (!body.surprise || body.surprise.id !== publicationId || body.surprise.slug !== slug) {
          setMediaRecoveryError("照片暂时无法恢复，请稍后重试。");
          return false;
        }
        const refreshed = body.surprise;
        setCurrentSurprise((current) => "mode" in current
          ? current
          : mergeRefreshedMedia(current, refreshed));
        setMediaRecoveryError(undefined);
        return true;
      } catch {
        setMediaRecoveryError("照片暂时无法恢复，请检查网络后重试。");
        return false;
      } finally {
        setMediaRefreshing(false);
        refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = request;
    return request;
  }, [currentSurprise, isPreview]);

  useEffect(() => {
    if (isPreview || !("slug" in currentSurprise)) return;
    const expiry = getEarliestMediaExpiry(currentSurprise);
    if (!expiry) return;
    const refreshIfDue = () => {
      if (Date.now() + 5_000 >= expiry) void refreshMedia("expiry");
    };
    const timer = window.setTimeout(
      () => void refreshMedia("expiry"),
      Math.max(0, expiry - Date.now() - 30_000),
    );
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshIfDue();
    };
    window.addEventListener("focus", refreshIfDue);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refreshIfDue);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [currentSurprise, isPreview, refreshMedia]);

  const handleMediaLoad = () => {
    setMediaRecoveryError(undefined);
  };

  return (
    <main className="relative isolate mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-[var(--page)] px-4 pb-5 pt-4 sm:px-5">
      <header className="flex min-h-12 items-center justify-between gap-4" aria-label="惊喜流程进度">
        <div>
          {isPreview ? (
            <p className="text-[11px] font-bold tracking-wide text-[var(--coral-dark)]">本地预览</p>
          ) : null}
          <p className="text-sm font-bold">给 {currentSurprise.recipient.displayName} 的惊喜</p>
        </div>
        <p className="text-xs font-bold text-[var(--muted)]" aria-live="polite">
          {currentIndex + 1} / {steps.length}
        </p>
      </header>

      <div className="flex flex-1 items-center py-4">
        {step === "opening" && (
          <Opening
            recipient={currentSurprise.recipient}
            sender={currentSurprise.sender}
            opening={currentSurprise.opening}
            onOpen={() => advance(
              "opening",
              currentSurprise.unlock.kind === "none" ? "memory" : "unlock",
            )}
          />
        )}
        {step === "unlock" && currentSurprise.unlock.kind !== "none" && (
          <UnlockGame
            config={currentSurprise.unlock}
            onComplete={handleUnlockComplete}
            onFallback={handleUnlockFallback}
          />
        )}
        {step === "memory" && currentSurprise.memory.kind === "card" && (
          <BirthdayCard
            recipient={currentSurprise.recipient}
            sender={currentSurprise.sender}
            card={currentSurprise.memory.card}
            onContinue={() => advance("memory", hasGift ? "gift" : "share")}
          />
        )}
        {step === "memory" && currentSurprise.memory.kind === "scrapbook" && (
          <Scrapbook
            scrapbook={currentSurprise.memory.scrapbook}
            onContinue={() => advance("memory", hasGift ? "gift" : "share")}
            onMediaError={isPreview ? undefined : () => void refreshMedia("error")}
            onMediaLoad={isPreview ? undefined : handleMediaLoad}
            onRetryMedia={isPreview ? undefined : () => refreshMedia("manual")}
            mediaRefreshing={mediaRefreshing}
            mediaRecoveryError={mediaRecoveryError}
          />
        )}
        {step === "gift" && hasGift && (
          <GiftReveal
            gift={currentSurprise.gift}
            onReveal={() => undefined}
            onContinue={() => advance("gift", "share")}
          />
        )}
        {step === "share" && (
          <Share
            recipientName={currentSurprise.recipient.displayName}
            gift={currentSurprise.gift}
            portrait={currentSurprise.portrait}
            onReplay={() => setStep("opening")}
            onExitPreview={isPreview ? onExitPreview : undefined}
            onMediaError={isPreview ? undefined : () => void refreshMedia("error")}
            onMediaLoad={isPreview ? undefined : handleMediaLoad}
            onRetryMedia={isPreview ? undefined : () => refreshMedia("manual")}
            mediaRefreshing={mediaRefreshing}
            mediaRecoveryError={mediaRecoveryError}
          />
        )}
      </div>
    </main>
  );
}
