import type { SenderStep } from "../../lib/surprise-contract";

export type SenderMemoryScreen = "choice" | "portrait";

export function usesMemoryComposerLayout(
  step: SenderStep,
  memoryScreen: SenderMemoryScreen,
): boolean {
  return step === "memory" && memoryScreen === "choice";
}
