import Image from "next/image";
import styles from "./tada-companion.module.css";

type TadaCompanionProps = {
  size?: number;
  className?: string;
};

/** Reusable neutral-wave Tada companion for quiet guidance surfaces. */
export function TadaCompanion({ size = 56, className }: TadaCompanionProps) {
  return (
    <Image
      src="/assets/tada/tada-companion-guide.png"
      alt=""
      aria-hidden="true"
      width={56}
      height={51}
      sizes={`${size}px`}
      className={[styles.root, className].filter(Boolean).join(" ")}
      style={{ width: size, height: "auto" }}
    />
  );
}
