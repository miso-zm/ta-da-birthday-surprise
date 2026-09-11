import { Cake, Gift, Heart, StarFour } from "@phosphor-icons/react";
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
      <StarFour weight="fill" className={`${styles.sparkle} ${styles.sparkleSmall}`} />
      <StarFour weight="fill" className={`${styles.sparkle} ${styles.sparkleLarge}`} />
    </span>
  );
}
