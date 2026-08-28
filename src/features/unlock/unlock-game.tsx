"use client";

import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type {
  BirthdayPasswordConfig,
  FindGiftConfig,
  RockPaperScissorsConfig,
  UnlockConfig,
  UnlockResult,
} from "@/lib/surprise-contract";
import { StageCard } from "@/features/shared/placeholders";
import {
  formatBirthday,
  getConfigIssue,
  getDirectionHint,
  getRpsRound,
  type RpsChoice,
} from "./unlock-logic";

type UnlockGameProps = {
  config: UnlockConfig;
  onComplete: (result: UnlockResult) => void;
  onFallback: (reason: string) => void;
};

type GameCallbacks = {
  onSolved: (attempts: number) => void;
  onRuntimeIssue: (reason: string) => void;
};

const gameLabels: Record<UnlockConfig["kind"], string> = {
  "find-gift": "找礼物",
  rps: "剪刀石头布",
  "birthday-password": "生日密码",
};

function getSessionKey(config: UnlockConfig): string {
  if (config.kind === "find-gift") return `${config.kind}:${config.targetId}`;
  if (config.kind === "birthday-password") return `${config.kind}:${config.answer}`;
  return config.kind;
}

export function UnlockGame(props: UnlockGameProps) {
  return <UnlockSession key={getSessionKey(props.config)} {...props} />;
}

function UnlockSession({ config, onComplete, onFallback }: UnlockGameProps) {
  const completed = useRef(false);
  const fallbackUsed = useRef(false);
  const [solvedAttempts, setSolvedAttempts] = useState<number | null>(null);
  const [runtimeIssue, setRuntimeIssue] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const issue = getConfigIssue(config) ?? runtimeIssue;

  const complete = () => {
    if (completed.current || solvedAttempts === null) return;
    completed.current = true;
    setIsLeaving(true);
    onComplete({ kind: config.kind, attempts: solvedAttempts, usedFallback: false });
  };

  const fallback = () => {
    if (fallbackUsed.current) return;
    fallbackUsed.current = true;
    setIsLeaving(true);
    onFallback(issue ?? "game-runtime-failed");
  };

  return (
    <StageCard label={`解锁小游戏 · ${gameLabels[config.kind]}`}>
      {issue ? (
        <TechnicalFallback disabled={isLeaving} onContinue={fallback} />
      ) : solvedAttempts !== null ? (
        <SuccessState disabled={isLeaving} onContinue={complete} />
      ) : config.kind === "find-gift" ? (
        <FindGiftGame config={config} onSolved={setSolvedAttempts} onRuntimeIssue={setRuntimeIssue} />
      ) : config.kind === "rps" ? (
        <RpsGame config={config} onSolved={setSolvedAttempts} onRuntimeIssue={setRuntimeIssue} />
      ) : (
        <BirthdayPasswordGame config={config} onSolved={setSolvedAttempts} onRuntimeIssue={setRuntimeIssue} />
      )}
    </StageCard>
  );
}

function TadaMessage({
  mood,
  children,
}: {
  mood: "waiting" | "thinking" | "celebrating";
  children: ReactNode;
}) {
  const moodLabel = {
    waiting: "陪你找线索",
    thinking: "正在想办法",
    celebrating: "一起庆祝",
  }[mood];

  return (
    <div className="mt-4 flex items-start gap-3 rounded-[18px] border-2 border-[var(--line)] bg-[#fff5df] p-3">
      <div
        aria-hidden="true"
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[45%_55%_48%_52%] border-2 border-[var(--line)] bg-[#fff6ec] text-xs font-black text-[var(--line)]"
      >
        <span className="absolute -top-1 left-2 h-3 w-2 -rotate-12 rounded-full border border-[var(--line)] bg-[#b7e1d2]" />
        <span className="absolute -top-1 right-2 h-3 w-2 rotate-12 rounded-full border border-[var(--line)] bg-[#b7e1d2]" />
        Tada
      </div>
      <div>
        <p className="text-xs font-black text-[var(--coral-dark)]">Tada · {moodLabel}</p>
        <div className="mt-1 text-sm font-semibold leading-5 text-[var(--ink)]">{children}</div>
      </div>
    </div>
  );
}

function SuccessState({ disabled, onContinue }: { disabled: boolean; onContinue: () => void }) {
  return (
    <div className="mt-5" aria-live="polite">
      <div className="rounded-[24px] border-2 border-[var(--line)] bg-[#fff5df] p-5 text-center shadow-[0_5px_0_var(--line)]">
        <p className="text-xs font-black tracking-wide text-[var(--coral-dark)]">解锁成功</p>
        <h2 className="mt-2 text-2xl font-black text-[var(--ink)]">Ta-da! 找到惊喜入口啦</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">下一站，是专门为你准备的生日心意。</p>
      </div>
      <TadaMessage mood="celebrating">做得好！我们一起继续拆惊喜吧。</TadaMessage>
      <ActionButton disabled={disabled} onClick={onContinue}>
        {disabled ? "正在继续…" : "继续看惊喜"}
      </ActionButton>
    </div>
  );
}

function TechnicalFallback({ disabled, onContinue }: { disabled: boolean; onContinue: () => void }) {
  return (
    <div className="mt-5 rounded-[24px] border-2 border-[var(--line)] bg-[#f9e4df] p-5" role="alert">
      <p className="text-lg font-black text-[var(--ink)]">小游戏暂时没有准备好</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">不是你的问题，我们先把后面的生日惊喜送到。</p>
      <ActionButton disabled={disabled} onClick={onContinue}>
        {disabled ? "正在继续…" : "先继续看惊喜"}
      </ActionButton>
    </div>
  );
}

const roomObjects = [
  { id: "window", label: "窗户", className: "left-[7%] top-[8%]" },
  { id: "plant-gift", label: "花盆", className: "right-[7%] top-[12%]" },
  { id: "sofa-gift", label: "沙发靠垫", className: "left-[34%] top-[42%]" },
  { id: "lamp", label: "落地灯", className: "right-[6%] bottom-[8%]" },
  { id: "cabinet-gift", label: "柜子", className: "left-[6%] bottom-[8%]" },
] as const;

function FindGiftGame({
  config,
  onSolved,
  onRuntimeIssue,
}: GameCallbacks & { config: FindGiftConfig }) {
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("Tada 把礼物藏在房间里了，点点你觉得可疑的地方。");

  const inspect = (objectId: string, label: string) => {
    try {
      const nextAttempts = attempts + 1;
      if (objectId === config.targetId) {
        setFeedback(`找到了！礼物就在${label}这里。`);
        onSolved(nextAttempts);
        return;
      }

      setAttempts(nextAttempts);
      if (nextAttempts >= 3) {
        setFeedback(`这里没有。Tada 提示：${getDirectionHint(config.targetId)}`);
      } else if (nextAttempts === 2) {
        setFeedback("这里也没有，不过你已经把范围缩小了，再观察一下。");
      } else {
        setFeedback("这里没有，换一个地方看看吧。");
      }
    } catch {
      onRuntimeIssue("find-gift-runtime-failed");
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-2xl font-black text-[var(--ink)]">礼物藏在哪里？</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">仔细看看这个小房间，礼物可能藏在某件东西附近。</p>
      <div
        className="relative mt-4 aspect-[4/3] overflow-hidden rounded-[22px] border-2 border-[var(--line)] bg-[#f6ead6]"
        aria-label="房间里有窗户、花盆、沙发靠垫、落地灯和柜子五个可寻找的位置"
      >
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[34%] border-t-2 border-[var(--line)] bg-[#edd4ae]" />
        <div aria-hidden="true" className="absolute left-[28%] top-[34%] h-[31%] w-[47%] rounded-[20px_20px_10px_10px] border-2 border-[var(--line)] bg-[#f1b9ad]" />
        {roomObjects.map((object) => (
          <button
            key={object.id}
            type="button"
            onClick={() => inspect(object.id, object.label)}
            aria-label={`查看${object.label}`}
            className={`absolute z-10 min-h-11 min-w-11 rounded-[14px] border-2 border-[var(--line)] bg-[var(--paper)] px-2 py-2 text-xs font-black text-[var(--ink)] shadow-[0_3px_0_var(--line)] outline-none focus-visible:ring-4 focus-visible:ring-[var(--butter)] active:translate-y-[3px] active:shadow-none ${object.className}`}
          >
            {object.label}
          </button>
        ))}
      </div>
      <div className="sr-only" aria-live="polite">已查看 {attempts} 个位置。</div>
      <TadaMessage mood={attempts >= 3 ? "thinking" : "waiting"}>
        <span aria-live="polite">{feedback}</span>
      </TadaMessage>
    </div>
  );
}

const rpsLabels: Record<RpsChoice, string> = {
  rock: "石头",
  scissors: "剪刀",
  paper: "布",
};

function RpsGame({
  onSolved,
  onRuntimeIssue,
}: GameCallbacks & { config: RockPaperScissorsConfig }) {
  const [rounds, setRounds] = useState(0);
  const [feedback, setFeedback] = useState("选好后，Tada 会同时出招。最迟第三轮一定能打开入口。");

  const play = (choice: RpsChoice) => {
    try {
      const nextRound = rounds + 1;
      const result = getRpsRound(choice, nextRound);
      setRounds(nextRound);
      setFeedback(
        `第 ${nextRound} 轮：你出了${rpsLabels[choice]}，Tada 出了${rpsLabels[result.opponent]}。${
          result.outcome === "win"
            ? "你赢了，解锁成功！"
            : result.outcome === "draw"
              ? "这一轮平局，再来一次。"
              : "这一轮 Tada 赢了，再试一次吧。"
        }`,
      );
      if (result.outcome === "win") onSolved(nextRound);
    } catch {
      onRuntimeIssue("rps-runtime-failed");
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-2xl font-black text-[var(--ink)]">和 Tada 猜一拳</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">赢下一轮，就能打开生日惊喜。</p>
      <fieldset className="mt-5">
        <legend className="text-sm font-black text-[var(--ink)]">请选择你的出招</legend>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(Object.keys(rpsLabels) as RpsChoice[]).map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => play(choice)}
              className="min-h-20 rounded-[18px] border-2 border-[var(--line)] bg-[#fff5df] px-2 text-base font-black text-[var(--ink)] shadow-[0_4px_0_var(--line)] outline-none focus-visible:ring-4 focus-visible:ring-[var(--butter)] active:translate-y-1 active:shadow-none"
            >
              <span aria-hidden="true" className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--coral)] text-sm text-white">
                {rpsLabels[choice].slice(0, 1)}
              </span>
              {rpsLabels[choice]}
            </button>
          ))}
        </div>
      </fieldset>
      <TadaMessage mood={rounds > 0 ? "thinking" : "waiting"}>
        <span aria-live="polite">{feedback}</span>
      </TadaMessage>
    </div>
  );
}

function BirthdayPasswordGame({
  config,
  onSolved,
  onRuntimeIssue,
}: GameCallbacks & { config: BirthdayPasswordConfig }) {
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("输入你的生日月日，四位数字就能打开入口。");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (value.length !== 4) {
        setFeedback(`还差 ${4 - value.length} 位，请输入完整的四位数字。`);
        return;
      }

      const nextAttempts = attempts + 1;
      if (value === config.answer) {
        setFeedback("密码正确，生日惊喜已经解锁！");
        onSolved(nextAttempts);
        return;
      }

      setAttempts(nextAttempts);
      setValue("");
      if (nextAttempts >= 2) {
        setFeedback(`再给你一个线索：生日是 ${formatBirthday(config.answer)}，请按 MMDD 输入四位数字。`);
      } else {
        setFeedback("还差一点。想想月份和日期，再试一次吧。");
      }
    } catch {
      onRuntimeIssue("birthday-password-runtime-failed");
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-2xl font-black text-[var(--ink)]">生日密码是什么？</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">用四位数字写下月和日，例如 8 月 28 日写作 0828。</p>
      <form className="mt-5" onSubmit={submit} noValidate>
        <label htmlFor="birthday-password" className="text-sm font-black text-[var(--ink)]">四位生日密码</label>
        <input
          id="birthday-password"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={4}
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, 4))}
          aria-describedby="birthday-password-format birthday-password-feedback"
          className="mt-2 min-h-14 w-full rounded-[18px] border-2 border-[var(--line)] bg-[var(--paper)] px-4 text-center text-2xl font-black tracking-[0.35em] text-[var(--ink)] outline-none focus-visible:ring-4 focus-visible:ring-[var(--butter)]"
          placeholder="MMDD"
        />
        <p id="birthday-password-format" className="mt-2 text-xs font-semibold text-[var(--muted)]">只会保留数字，不需要输入斜线。</p>
        <ActionButton disabled={false} submit>试试这个密码</ActionButton>
      </form>
      <div id="birthday-password-feedback">
        <TadaMessage mood={attempts > 0 ? "thinking" : "waiting"}>
          <span aria-live="polite">{feedback}</span>
        </TadaMessage>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  submit = false,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick?: () => void;
  submit?: boolean;
}) {
  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      disabled={disabled}
      className="mt-5 flex min-h-14 w-full items-center justify-center rounded-[18px] border-2 border-[var(--line)] bg-[var(--coral-dark)] px-5 font-extrabold text-white shadow-[0_4px_0_var(--line)] outline-none focus-visible:ring-4 focus-visible:ring-[var(--butter)] active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:bg-[#786962]"
    >
      {children}
    </button>
  );
}
