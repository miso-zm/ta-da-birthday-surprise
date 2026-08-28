import type { ScrapbookContent } from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";

export function Scrapbook({ scrapbook, onContinue }: { scrapbook: ScrapbookContent; onContinue: () => void }) {
  return (
    <StageCard label="Scrapbook 占位模块">
      <article className="mt-5 aspect-[3/4] rounded-[24px] border-2 border-[var(--line)] bg-[#f7e7b9] p-4">
        <h1 className="text-2xl font-black tracking-[-0.04em]">{scrapbook.title}</h1>
        <div className="mt-4 grid h-[78%] grid-cols-2 gap-3">
          {scrapbook.slots.map((slot, index) => (
            <figure key={slot.id} className={`${index === 2 ? "col-span-2" : ""} flex min-h-0 flex-col rounded-[18px] border-2 border-[var(--line)] bg-[var(--paper)] p-2`}>
              <div className="min-h-0 flex-1 rounded-[12px] bg-[#eadfce]" aria-label="照片占位区域" />
              <figcaption className="px-1 pb-1 pt-2 text-center text-xs font-bold">{slot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </article>
      <PrimaryButton onClick={onContinue}>继续拆礼物</PrimaryButton>
    </StageCard>
  );
}
