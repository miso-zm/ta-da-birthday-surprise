import type { ReactNode } from "react";

export function StageCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="w-full px-1 py-2">
      <p className="text-[13px] font-bold tracking-[0.01em] text-[var(--coral-dark)]">{label}</p>
      {children}
    </section>
  );
}

export function PrimaryButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-6 flex min-h-[52px] w-full items-center justify-center whitespace-nowrap rounded-[var(--radius-round)] border-0 bg-[var(--coral-action)] px-5 font-bold text-[var(--on-dark)] shadow-[var(--shadow-pressed)] transition-[transform,box-shadow,background-color] active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:bg-[#d7ccc3] disabled:text-[var(--ink)]"
    >
      {children}
    </button>
  );
}
