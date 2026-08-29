import Image from "next/image";
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
          <Image
            src="/assets/opening/receiver-opening-button-v2.png"
            alt=""
            fill
            sizes="276px"
            className={styles.buttonArtwork}
          />
          <span className={styles.starField} aria-hidden="true">
            <span className={styles.starSmall} />
            <span className={styles.starLarge} />
          </span>
        </button>
      </div>
    </section>
  );
}
