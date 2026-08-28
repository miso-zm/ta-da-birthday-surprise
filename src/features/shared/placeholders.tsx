import type { ReactNode } from "react";

export function StageCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="w-full rounded-[28px] border-2 border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_6px_0_var(--line)]">
      <p className="text-xs font-black text-[var(--coral-dark)]">{label}</p>
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
      className="mt-6 flex min-h-14 w-full items-center justify-center whitespace-nowrap rounded-[18px] border-2 border-[var(--line)] bg-[var(--coral)] px-5 font-extrabold text-white shadow-[0_4px_0_var(--line)] active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:bg-[#b9aaa1]"
    >
      {children}
    </button>
  );
}
