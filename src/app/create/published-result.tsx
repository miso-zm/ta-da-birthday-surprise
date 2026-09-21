"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./collection.module.css";
import { PrimaryButton } from "@/features/shared/placeholders";
import type { PublishedSurpriseLinks } from "@/lib/surprise-contract";

export function PublishedResult({
  result,
  historySaved = true,
}: {
  result: PublishedSurpriseLinks;
  historySaved?: boolean;
}) {
  const [status, setStatus] = useState("");
  const [showLink, setShowLink] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      setStatus("已复制");
    } catch {
      setShowLink(true);
      setStatus("暂时无法复制，请长按链接复制。");
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
    <main className={styles.result}>
      <section className={styles.resultCard}>
        <Image src="/assets/gift/tada-gift-receipt-hero-v1.png" alt="Tada 从礼盒里开心地蹦出来" width={180} height={180} className={styles.hero} priority />
        <h1 className="text-3xl font-bold tracking-[-0.04em]">心意已经准备好了</h1>
        <p className={styles.subtitle}>
          把这份生日快乐，送给 TA。
        </p>
        {showLink ? <div className="mt-5 select-all rounded-[var(--radius-sm)] bg-[var(--page)] p-4 text-sm font-semibold break-all">
          {result.shareUrl}
        </div> : null}
        <PrimaryButton onClick={shareLink}>
          分享给 TA
        </PrimaryButton>
        <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" onClick={copyLink} className="min-h-12 rounded-[var(--radius-round)] border border-[var(--ui-line)] bg-transparent px-3 font-semibold text-[var(--ink)]">
          复制链接
        </button>
        <a href={result.shareUrl} target="_blank" rel="noreferrer noopener" className="flex min-h-12 items-center justify-center rounded-[var(--radius-round)] border border-[var(--ui-line)] px-3 font-semibold text-[var(--ink)]">
          查看效果
        </a>
        </div>
        {status ? <p role="status" className={styles.note}>{status}</p> : null}
        {!historySaved ? <p role="status" className={styles.note}>浏览器暂时无法保存作品入口，请保留下方管理页地址。</p> : null}
        <div className={styles.resultFooter}><a href={result.manageUrl}>管理这份心意</a><a href="/create/works">我的作品</a></div>
      </section>
    </main>
  );
}
