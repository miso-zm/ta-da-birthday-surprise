import {
  FIND_GIFT_TARGET_IDS,
  type FindGiftTargetId,
  type UnlockConfig,
} from "@/lib/surprise-contract";

export type RpsChoice = "rock" | "paper" | "scissors";
export type RpsOutcome = "win" | "draw" | "lose";

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

export function getDirectionHint(targetId: FindGiftTargetId): string {
  const hints: Record<FindGiftTargetId, string> = {
    "cabinet-gift": "往房间左下角的大件家具附近看看。",
    "sofa-gift": "礼物离房间中央柔软的地方不远。",
    "plant-gift": "试试靠近窗边、有叶子的角落。",
  };
  return hints[targetId];
}

export function formatBirthday(answer: string): string {
  const month = Number(answer.slice(0, 2));
  const day = Number(answer.slice(2, 4));
  return `${month} 月 ${day} 日`;
}

export function getConfigIssue(config: UnlockConfig): string | null {
  if (config.kind === "find-gift") {
    return FIND_GIFT_TARGET_IDS.includes(config.targetId)
      ? null
      : "find-gift-config-invalid";
  }

  if (config.kind === "birthday-password") {
    if (!/^\d{4}$/.test(config.answer)) {
      return "birthday-password-config-invalid";
    }
    const month = Number(config.answer.slice(0, 2));
    const day = Number(config.answer.slice(2, 4));
    const maxDay = month >= 1 && month <= 12
      ? new Date(2000, month, 0).getDate()
      : 0;
    return day >= 1 && day <= maxDay
      ? null
      : "birthday-password-config-invalid";
  }

  return null;
}
