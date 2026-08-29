import type {
  FindGiftTargetId,
  PlayableUnlockConfig,
} from "@/lib/surprise-contract";

export type RpsChoice = "rock" | "paper" | "scissors";
export type RpsOutcome = "win" | "draw" | "lose";

export const BLOW_CANDLE_THRESHOLDS_MS = [350, 700, 1050] as const;
export const BLOW_CANDLES_COMPLETION_MS = BLOW_CANDLE_THRESHOLDS_MS[2];

export type MicrophoneRequestStatus = {
  requestId: number;
  activeRequestId: number;
  mounted: boolean;
  completed: boolean;
  fallbackActive: boolean;
};

export function isMicrophoneRequestActive({
  requestId,
  activeRequestId,
  mounted,
  completed,
  fallbackActive,
}: MicrophoneRequestStatus): boolean {
  return mounted
    && requestId === activeRequestId
    && !completed
    && !fallbackActive;
}

export function getExtinguishedCandleCount(blowDurationMs: number): number {
  const safeDuration = Number.isFinite(blowDurationMs)
    ? Math.max(0, blowDurationMs)
    : 0;
  return BLOW_CANDLE_THRESHOLDS_MS.filter(
    (threshold) => safeDuration >= threshold,
  ).length;
}

export function getBlowProgress(blowDurationMs: number): number {
  const safeDuration = Number.isFinite(blowDurationMs)
    ? Math.max(0, blowDurationMs)
    : 0;
  return Math.min(
    100,
    Math.round((safeDuration / BLOW_CANDLES_COMPLETION_MS) * 100),
  );
}

export function getLastExtinguishedThreshold(blowDurationMs: number): number {
  const extinguishedCount = getExtinguishedCandleCount(blowDurationMs);
  return extinguishedCount === 0
    ? 0
    : BLOW_CANDLE_THRESHOLDS_MS[extinguishedCount - 1];
}

const choices: RpsChoice[] = ["rock", "paper", "scissors"];

const beatenBy: Record<RpsChoice, RpsChoice> = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

export function getRpsRound(
  player: RpsChoice,
  round: number,
  random: () => number = Math.random,
): { opponent: RpsChoice; outcome: RpsOutcome } {
  const opponent = round >= 3
    ? beatenBy[player]
    : choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];

  if (opponent === player) return { opponent, outcome: "draw" };
  if (beatenBy[player] === opponent) return { opponent, outcome: "win" };
  return { opponent, outcome: "lose" };
}

const directionHints: Record<FindGiftTargetId, string> = {
  "sofa-box": "再往房间中央看看，礼物离沙发不远。",
  "plant-box": "再往房间右侧看看，礼物靠近高高的绿植。",
  "rug-box": "再往房间左下方看看，线索靠近软软的地毯。",
};

export type FindGiftWrongFeedback = {
  title: string;
  message: string;
  showsDirectionHint: boolean;
};

export function getFindGiftWrongFeedback(
  targetId: FindGiftTargetId,
  attempts: number,
  guessedLabel: string,
): FindGiftWrongFeedback {
  if (attempts >= 3) {
    return {
      title: "给你一点方向",
      message: getDirectionHint(targetId),
      showsDirectionHint: true,
    };
  }

  return {
    title: `不是${guessedLabel}`,
    message: attempts === 1
      ? "没关系，范围更小了。再凭直觉选一只吧。"
      : "又排除了一只，再看看房间里剩下的礼物盒。",
    showsDirectionHint: false,
  };
}

export function getDirectionHint(targetId: FindGiftTargetId): string {
  return directionHints[targetId];
}

export function getConfigIssue(config: PlayableUnlockConfig): string | null {
  if (config.kind === "find-gift") {
    return Object.prototype.hasOwnProperty.call(directionHints, config.targetId)
      ? null
      : "find-gift-config-invalid";
  }

  return null;
}
