"use client";

import { useState } from "react";
import Image from "next/image";
import type { ShareResult } from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";

type ShareProps = {
  url: string;
  title: string;
  text: string;
  onResult: (result: ShareResult) => void;
  onReplay: () => void;
};

export function Share({ url, title, text, onResult, onReplay }: ShareProps) {
  const [status, setStatus] = useState<string>("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("链接已经复制");
      onResult("copied");
    } catch {
      setStatus("暂时没能复制，请从地址栏复制链接");
      onResult("failed");
    }
  };

  const share = async () => {
    if (!navigator.share) {
      await copy();
      return;
    }

    try {
      await navigator.share({ title, text, url });
      setStatus("已经打开分享面板");
      onResult("shared");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("");
        onResult("cancelled");
        return;
      }
      setStatus("暂时无法分享，可以先复制链接");
      onResult("failed");
    }
  };

  return (
    <StageCard label="Ta-da! 惊喜已送达">
      <Image
        src="/assets/share/tada-share-complete-v1.png"
        alt="Tada 抱着珊瑚色礼物，开心地送出惊喜"
        width={96}
        height={96}
        className="mx-auto mt-7 size-24 rounded-[1.5rem] object-cover shadow-[var(--shadow-card)]"
      />
      <h1 className="mt-6 text-center text-3xl font-bold tracking-[-0.04em]">这份惊喜就到这里啦</h1>
      <p className="mt-3 text-center text-sm font-medium leading-6 text-[var(--muted)]">希望它替你留住了一个开心的瞬间。</p>
      <div className="paper-surface mt-5 rounded-[var(--radius-sm)] px-4 py-3 text-sm font-semibold break-all">{url}</div>
      <PrimaryButton onClick={share}>分享这份惊喜</PrimaryButton>
      <button type="button" onClick={copy} className="mt-3 min-h-12 w-full rounded-[var(--radius-round)] border border-[var(--ui-line)] bg-[var(--paper)] px-4 font-bold text-[var(--ink)]">
        复制分享链接
      </button>
      <p aria-live="polite" className="min-h-8 pt-3 text-center text-sm font-bold text-[var(--muted)]">{status}</p>
      <button type="button" onClick={onReplay} className="min-h-11 w-full text-sm font-bold text-[var(--muted)] underline underline-offset-4">
        再看一次
      </button>
    </StageCard>
  );
}
