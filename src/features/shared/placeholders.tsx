import type { ButtonHTMLAttributes, ReactNode } from "react";
import { PrimaryActionDecoration } from "@/components/primary-action-decoration/primary-action-decoration";
import styles from "./placeholders.module.css";

export function StageCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="w-full px-1 py-2">
      <p className="text-[13px] font-bold tracking-[0.01em] text-[var(--coral-dark)]">{label}</p>
      {children}
    </section>
  );
}

type PrimaryButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  children: ReactNode;
};

export function PrimaryButton({ children, className = "", ...props }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`${styles.primaryButton} ${className}`}
    >
      <PrimaryActionDecoration />
      <span className={styles.label}>{children}</span>
    </button>
  );
}
