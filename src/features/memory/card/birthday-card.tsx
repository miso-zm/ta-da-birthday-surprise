import type { CardContent, Person } from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";

type BirthdayCardProps = {
  recipient: Person;
  sender: Person;
  card: CardContent;
  onContinue: () => void;
};

export function BirthdayCard({ recipient, sender, card, onContinue }: BirthdayCardProps) {
  return (
    <StageCard label="Birthday Card 占位模块">
      <article className="mt-5 aspect-[3/4] rounded-[24px] border-2 border-[var(--line)] bg-[#fff9e8] p-6">
        <p className="text-sm font-black text-[var(--coral-dark)]">TO {recipient.displayName}</p>
        <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em]">新的一岁，继续做喜欢的事</h1>
        <p className="mt-6 text-[15px] font-semibold leading-7 text-[var(--muted)]">{card.message}</p>
        <p className="mt-8 text-right font-black">{sender.displayName || card.signature}</p>
      </article>
      <PrimaryButton onClick={onContinue}>继续看我们的回忆</PrimaryButton>
    </StageCard>
  );
}
