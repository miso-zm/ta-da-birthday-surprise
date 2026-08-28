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
    <StageCard label="Opening 占位模块">
      <div className="grid size-24 place-items-center rounded-full border-2 border-[var(--line)] bg-[var(--butter)] text-3xl font-black">HBD</div>
      <h1 className="mt-6 text-[34px] font-black leading-tight tracking-[-0.05em]">{opening.title}</h1>
      <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--muted)]">{opening.prompt}</p>
      <p className="mt-4 text-sm font-bold">来自 {sender.displayName}，只给 {recipient.displayName}</p>
      <PrimaryButton onClick={onOpen}>拆开看看</PrimaryButton>
    </StageCard>
  );
}
