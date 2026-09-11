import Image from "next/image";
import { PrimaryActionDecoration } from "@/components/primary-action-decoration/primary-action-decoration";
import type { OpeningContent, Person } from "@/lib/surprise-contract";
import styles from "./opening.module.css";

type OpeningProps = {
  recipient: Person;
  sender: Person;
  opening: OpeningContent;
  onOpen: () => void;
};

export function Opening({ recipient, sender, opening, onOpen }: OpeningProps) {
  return (
    <section
      className={styles.overlay}
      aria-labelledby="receiver-opening-title"
      aria-describedby="receiver-opening-description"
    >
      <div className={styles.frame}>
        <Image
          src="/assets/opening/receiver-opening-bg-v3.png"
          alt=""
          fill
          priority
          sizes="(max-width: 430px) 100vw, 430px"
          className={styles.background}
        />

        <div className="sr-only">
          <h1 id="receiver-opening-title">{opening.title}</h1>
          <p id="receiver-opening-description">{opening.prompt}</p>
          <p>
            {sender.displayName} 送给 {recipient.displayName} 的生日惊喜
          </p>
        </div>

        <p className={styles.footerCopy}>嘿！这里有一份属于你的小惊喜。</p>

        <button
          type="button"
          onClick={onOpen}
          className={styles.openButton}
          aria-label={`拆开看看：${sender.displayName} 送给 ${recipient.displayName} 的生日惊喜`}
        >
          <PrimaryActionDecoration />
          <span className={styles.buttonLabel}>拆开看看</span>
        </button>
      </div>
    </section>
  );
}
