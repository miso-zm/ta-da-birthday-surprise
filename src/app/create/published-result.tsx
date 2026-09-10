"use client";

import { useState } from "react";
import type { PublishedSurpriseLinks } from "@/lib/surprise-contract";

export function PublishedResult({
  result,
  onEdit,
}: {
  result: PublishedSurpriseLinks;
  onEdit: () => void;
}) {
  const [status, setStatus] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      setStatus("分享链接已复制");
    } catch {
      setStatus("暂时无法复制，请长按下方链接复制。");
    }
  }

  async function shareLink() {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: "Ta-da! 生日惊喜", url: result.shareUrl });
      setStatus("已打开分享面板");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setStatus("暂时无法分享，可以先复制链接。");
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] items-center px-4 py-6 sm:px-5">
      <section className="paper-surface paper-fold w-full p-6">
        <p className="text-sm font-bold text-[var(--coral-dark)]">Ta-da!</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">惊喜已经准备好了</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
          把下面的专属链接发给 TA。拿到链接的人都可以查看，请只发给你信任的人。
        </p>
        <div className="mt-5 rounded-[var(--radius-sm)] bg-[var(--page)] p-4 text-sm font-semibold break-all">
          {result.shareUrl}
        </div>
        <button type="button" onClick={shareLink} className="mt-5 min-h-12 w-full rounded-[var(--radius-round)] bg-[var(--coral-action)] px-5 font-bold text-[var(--on-dark)]">
          分享这份惊喜
        </button>
        <button type="button" onClick={copyLink} className="mt-3 min-h-12 w-full rounded-[var(--radius-round)] border border-[var(--ui-line)] bg-[var(--paper)] px-5 font-bold text-[var(--ink)]">
          复制分享链接
        </button>
        <p aria-live="polite" className="min-h-8 pt-3 text-center text-sm font-bold text-[var(--muted)]">{status}</p>
        <a href={result.shareUrl} target="_blank" rel="noreferrer noopener" className="flex min-h-11 items-center justify-center text-sm font-bold text-[var(--ink)] underline underline-offset-4">
          在新窗口检查链接
        </a>
        <a href={result.manageUrl} className="mt-2 flex min-h-11 items-center justify-center text-sm font-bold text-[var(--ink)] underline underline-offset-4">
          管理或撤回这份惊喜
        </a>
        <button type="button" onClick={onEdit} className="mt-2 min-h-11 w-full text-sm font-bold text-[var(--muted)]">
          继续修改草稿
        </button>
        <p className="mt-4 text-xs font-semibold leading-5 text-[var(--muted)]">
          默认保留一年。修改后再发布会得到新链接，不会悄悄改变这一份。
        </p>
      </section>
    </main>
  );
}
