import { Cake, Gift, Heart, Sparkle } from "@phosphor-icons/react";
import styles from "./primary-action-decoration.module.css";

export function PrimaryActionDecoration() {
  return (
    <span className={styles.root} aria-hidden="true">
      <Gift weight="fill" className={`${styles.icon} ${styles.giftLarge}`} />
      <Gift weight="fill" className={`${styles.icon} ${styles.giftSmall}`} />
      <Cake weight="fill" className={`${styles.icon} ${styles.cakeLarge}`} />
      <Cake weight="fill" className={`${styles.icon} ${styles.cakeSmall}`} />
      <Heart weight="fill" className={`${styles.icon} ${styles.heartLarge}`} />
      <Heart weight="fill" className={`${styles.icon} ${styles.heartSmall}`} />
      <Sparkle weight="fill" className={`${styles.sparkle} ${styles.sparkleSmall}`} />
      <Sparkle weight="fill" className={`${styles.sparkle} ${styles.sparkleLarge}`} />
    </span>
  );
}
