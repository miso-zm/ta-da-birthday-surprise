"use client";

import { useState } from "react";
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
      setStatus("链接已复制");
      onResult("copied");
    } catch {
      setStatus("复制失败，请从地址栏复制链接");
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
      setStatus("分享完成");
      onResult("shared");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("");
        onResult("cancelled");
        return;
      }
      setStatus("暂时无法分享，可以复制链接");
      onResult("failed");
    }
  };

  return (
    <StageCard label="Share 占位模块">
      <div className="mx-auto mt-7 grid size-24 place-items-center rounded-full border-2 border-[var(--line)] bg-[var(--sage)] text-3xl font-black">OK</div>
      <h1 className="mt-6 text-center text-3xl font-black tracking-[-0.04em]">惊喜已经全部打开</h1>
      <p className="mt-3 text-center text-sm font-semibold leading-6 text-[var(--muted)]">这条 Receiver 主链路已经完整跑通。</p>
      <div className="mt-5 rounded-[16px] bg-[#f2e9dc] px-4 py-3 text-sm font-bold break-all">{url}</div>
      <PrimaryButton onClick={share}>分享给朋友</PrimaryButton>
      <button type="button" onClick={copy} className="mt-3 min-h-12 w-full rounded-[16px] border-2 border-[var(--line)] bg-[var(--paper)] px-4 font-extrabold">
        复制链接
      </button>
      <p aria-live="polite" className="min-h-8 pt-3 text-center text-sm font-bold text-[var(--muted)]">{status}</p>
      <button type="button" onClick={onReplay} className="min-h-11 w-full text-sm font-bold text-[var(--muted)] underline underline-offset-4">
        重新查看惊喜
      </button>
    </StageCard>
  );
}
