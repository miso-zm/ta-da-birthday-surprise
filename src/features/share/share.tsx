"use client";

import Image from "next/image";
import type { GiftContent, PortraitPosterContent } from "@/lib/surprise-contract";
import { getPublicGiftLink } from "@/lib/gift-link-policy";
import styles from "./share.module.css";

type ShareProps = {
  recipientName: string;
  gift: GiftContent;
  portrait?: PortraitPosterContent;
  onReplay: () => void;
  onExitPreview?: () => void;
};

export function Share({ recipientName, gift, portrait, onReplay, onExitPreview }: ShareProps) {
  const giftLink = gift.kind === "link" ? getPublicGiftLink(gift.externalUrl) : null;
  return (
    <section className={styles.ending} aria-labelledby="birthday-ending-title">
      {portrait ? (
        <div className={styles.portraitPoster}>
          <Image
            src={portrait.imageUrl}
            alt={`${recipientName} 的生日主角海报`}
            width={720}
            height={720}
            unoptimized
            className={styles.portraitPosterImage}
          />
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
