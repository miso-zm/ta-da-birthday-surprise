import type { OpeningContent, Person } from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";

type OpeningProps = {
  recipient: Person;
  sender: Person;
  opening: OpeningContent;
  onOpen: () => void;
};

export function Opening({ recipient, sender, opening, onOpen }: OpeningProps) {
  return (
    <StageCard label="一份专门为你准备的生日惊喜">
      <div className="paper-surface paper-fold mt-4 p-6 pt-8">
        <div className="grid size-24 place-items-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--butter)_26%,white)] text-2xl font-bold text-[var(--ink)]">Ta-da!</div>
        <h1 className="mt-6 text-[34px] font-bold leading-tight tracking-[-0.045em]">{opening.title}</h1>
        <div className="mt-3 h-1.5 w-24 -rotate-1 rounded-full bg-[color-mix(in_srgb,var(--coral)_72%,transparent)]" aria-hidden="true" />
        <p className="mt-4 text-[15px] font-medium leading-7 text-[var(--muted)]">{opening.prompt}</p>
        <p className="mt-4 text-sm font-semibold text-[var(--ink)]">来自 {sender.displayName}，送给 {recipient.displayName}</p>
        <PrimaryButton onClick={onOpen}>打开这份惊喜</PrimaryButton>
      </div>
    </StageCard>
  );
}
