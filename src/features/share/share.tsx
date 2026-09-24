"use client";

import Image from "next/image";
import { useState } from "react";
import type { GiftContent, PortraitPosterContent } from "@/lib/surprise-contract";
import { getPublicGiftLink } from "@/lib/gift-link-policy";
import { ConfettiBurst } from "@/features/shared/confetti-burst";
import styles from "./share.module.css";

type ShareProps = {
  recipientName: string;
  gift: GiftContent;
  portrait?: PortraitPosterContent;
  onReplay: () => void;
  onExitPreview?: () => void;
  onMediaError?: () => void;
  onMediaLoad?: () => void;
  onRetryMedia?: () => Promise<boolean>;
  mediaRefreshing?: boolean;
  mediaRecoveryError?: string;
};

export function Share({
  recipientName,
  gift,
  portrait,
  onReplay,
  onExitPreview,
  onMediaError,
  onMediaLoad,
  onRetryMedia,
  mediaRefreshing = false,
  mediaRecoveryError,
}: ShareProps) {
  const giftLink = gift.kind === "link" ? getPublicGiftLink(gift.externalUrl) : null;
  const [failedPortraitUrl, setFailedPortraitUrl] = useState<string>();
  const portraitFailed = Boolean(portrait && failedPortraitUrl === portrait.imageUrl);
  return (
    <section className={styles.ending} aria-labelledby="birthday-ending-title">
      <ConfettiBurst variant="ending" />
      {portrait && !portraitFailed ? (
        <div className={styles.portraitPoster}>
          <Image
            key={portrait.imageUrl}
            src={portrait.imageUrl}
            alt={`${recipientName} 的生日主角海报`}
            width={720}
            height={720}
            unoptimized
            className={styles.portraitPosterImage}
            onLoad={onMediaLoad}
            onError={() => {
              setFailedPortraitUrl(portrait.imageUrl);
              onMediaError?.();
            }}
          />
        </div>
      ) : portrait ? (
        <div className={styles.portraitRecovery} role="status" aria-live="polite">
          <p>{mediaRecoveryError ?? "主角海报暂时没能打开。"}</p>
          <button
            type="button"
            disabled={mediaRefreshing}
            onClick={async () => {
              if (!onRetryMedia || await onRetryMedia()) setFailedPortraitUrl(undefined);
            }}
          >{mediaRefreshing ? "正在恢复…" : "重新加载海报"}</button>
        </div>
      ) : (
        <div className={styles.illustration}>
          <div className={styles.confetti} aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => <span key={i} />)}
          </div>
          <Image src="/assets/gift/tada-collection-cutout-v1.png" alt="Tada 从礼盒里开心地蹦出来，彩纸庆祝生日" width={260} height={200} className={styles.tada} />
        </div>
      )}
      <h1 id="birthday-ending-title" className={styles.title}>生日快乐，{recipientName}！</h1>
      <p className={styles.message}>愿这份心意，<br />陪你开启开心的新一岁。</p>
      <div className={styles.actions}>
        {giftLink ? (
          <a className={styles.giftLink} href={giftLink.url} target="_blank" rel="noopener noreferrer">
            {giftLink.kind === "gift" ? "打开送礼页" : "查看商品页"}
          </a>
        ) : null}
        <button type="button" className={styles.textAction} onClick={onReplay}>再看一次</button>
        {onExitPreview ? <button type="button" className={styles.textAction} onClick={onExitPreview}>回去继续编辑</button> : null}
      </div>
    </section>
  );
}
