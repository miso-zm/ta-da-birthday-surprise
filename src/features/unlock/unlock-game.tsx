"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import type {
  BlowCandlesConfig,
  FindGiftConfig,
  PlayableUnlockConfig,
  RockPaperScissorsConfig,
  UnlockResult,
} from "@/lib/surprise-contract";
import { StageCard } from "@/features/shared/placeholders";
import {
  BLOW_CANDLES_COMPLETION_MS,
  getConfigIssue,
  getBlowProgress,
  getExtinguishedCandleCount,
  getFindGiftWrongFeedback,
  getLastExtinguishedThreshold,
  isMicrophoneRequestActive,
  getRpsRound,
  type RpsChoice,
  type RpsOutcome,
} from "./unlock-logic";
import styles from "./unlock-game.module.css";

type UnlockGameProps = {
  config: PlayableUnlockConfig;
  onComplete: (result: UnlockResult) => void;
  onFallback: (reason: string) => void;
};

type GameCallbacks = {
  onSolved: (attempts: number, usedFallback?: boolean) => void;
  onRuntimeIssue: (reason: string) => void;
};

const gameLabels: Record<PlayableUnlockConfig["kind"], string> = {
  "find-gift": "找礼物",
  rps: "剪刀石头布",
  "blow-candles": "吹蜡烛",
};

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getReducedMotionPreference() {
  return window.matchMedia?.(reducedMotionQuery).matches ?? false;
}

function getServerReducedMotionPreference() {
  return false;
}

function releaseMicrophoneResources(stream: MediaStream | null, audioContext: AudioContext | null) {
  stream?.getTracks().forEach((track) => track.stop());
  if (audioContext) {
    void audioContext.close().catch(() => undefined);
  }
}

function getSessionKey(config: PlayableUnlockConfig): string {
  if (config.kind === "find-gift") return `${config.kind}:${config.targetId}`;
  return config.kind;
}

export function UnlockGame(props: UnlockGameProps) {
  return <UnlockSession key={getSessionKey(props.config)} {...props} />;
}

function UnlockSession({ config, onComplete, onFallback }: UnlockGameProps) {
  const completed = useRef(false);
  const fallbackUsed = useRef(false);
  const [solvedResult, setSolvedResult] = useState<{
    attempts: number;
    usedFallback: boolean;
  } | null>(null);
  const [runtimeIssue, setRuntimeIssue] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const issue = getConfigIssue(config) ?? runtimeIssue;

  const complete = () => {
    if (completed.current || solvedResult === null) return;
    completed.current = true;
    setIsLeaving(true);
    onComplete({ kind: config.kind, ...solvedResult });
  };

  const solved = (attempts: number, usedFallback = false) => {
    setSolvedResult((current) => current ?? { attempts, usedFallback });
  };

  const fallback = () => {
    if (fallbackUsed.current) return;
    fallbackUsed.current = true;
    setIsLeaving(true);
    onFallback(issue ?? "game-runtime-failed");
  };

  const gameContent = issue ? (
    <TechnicalFallback disabled={isLeaving} onContinue={fallback} />
  ) : solvedResult !== null ? (
    config.kind === "find-gift" ? (
      <FindGiftSuccessState
        config={config}
        attempts={solvedResult.attempts}
        disabled={isLeaving}
        onContinue={complete}
        onRuntimeIssue={setRuntimeIssue}
      />
    ) : config.kind === "blow-candles" ? (
      <BlowCandlesSuccessState
        disabled={isLeaving}
        onContinue={complete}
        onRuntimeIssue={setRuntimeIssue}
      />
    ) : (
      <SuccessState disabled={isLeaving} onContinue={complete} />
    )
  ) : config.kind === "find-gift" ? (
    <FindGiftGame config={config} onSolved={solved} onRuntimeIssue={setRuntimeIssue} />
  ) : config.kind === "rps" ? (
    <RpsGame config={config} onSolved={solved} onRuntimeIssue={setRuntimeIssue} />
  ) : (
    <BlowCandlesGame config={config} onSolved={solved} onRuntimeIssue={setRuntimeIssue} />
  );

  if (config.kind === "blow-candles" || config.kind === "rps") {
    return <section className="w-full px-1 py-2">{gameContent}</section>;
  }

  return <StageCard label={`解锁小游戏 · ${gameLabels[config.kind]}`}>{gameContent}</StageCard>;
}

function TadaMessage({
  mood,
  children,
}: {
  mood: "waiting" | "thinking" | "celebrating";
  children: ReactNode;
}) {
  const moodLabel = {
    waiting: "陪你一起找",
    thinking: "再想想",
    celebrating: "一起庆祝",
  }[mood];

  return (
    <div className="paper-surface mt-4 flex items-start gap-3 rounded-[var(--radius-md)] p-3">
      <div
        aria-hidden="true"
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[45%_55%_48%_52%] border border-[var(--pencil)] bg-[#fff6ec] text-xs font-bold text-[var(--line)]"
      >
        <span className="absolute -top-1 left-2 h-3 w-2 -rotate-12 rounded-full border border-[var(--line)] bg-[#b7e1d2]" />
        <span className="absolute -top-1 right-2 h-3 w-2 rotate-12 rounded-full border border-[var(--line)] bg-[#b7e1d2]" />
        Tada
      </div>
      <div>
        <p className="text-xs font-bold text-[var(--coral-dark)]">Tada · {moodLabel}</p>
        <div className="mt-1 text-sm font-semibold leading-5 text-[var(--ink)]">{children}</div>
      </div>
    </div>
  );
}

function SuccessState({ disabled, onContinue }: { disabled: boolean; onContinue: () => void }) {
  return (
    <div className="mt-5" aria-live="polite">
      <div className="paper-surface p-5 text-center">
        <p className="text-xs font-bold tracking-wide text-[var(--coral-dark)]">解锁成功</p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--ink)]">Ta-da! 惊喜打开啦</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">下一步，去看看专门为你准备的心意。</p>
      </div>
      <TadaMessage mood="celebrating">做得好！接着拆下一份惊喜吧。</TadaMessage>
      <ActionButton disabled={disabled} onClick={onContinue}>
        {disabled ? "正在继续…" : "继续打开惊喜"}
      </ActionButton>
    </div>
  );
}

function TechnicalFallback({ disabled, onContinue }: { disabled: boolean; onContinue: () => void }) {
  return (
    <div className="soft-surface mt-5 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-danger)_12%,white)] p-5" role="alert">
      <p className="text-lg font-bold text-[var(--ink)]">小游戏暂时没准备好</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">没关系，后面的生日惊喜会直接送到你面前。</p>
      <ActionButton disabled={disabled} onClick={onContinue}>
        {disabled ? "正在继续…" : "继续打开惊喜"}
      </ActionButton>
    </div>
  );
}

const giftTargets = [
  { id: "sofa-box", label: "沙发上的绿礼盒", shortLabel: "沙发这只", position: styles.sofa },
  { id: "plant-box", label: "花盆旁的黄礼盒", shortLabel: "花盆这只", position: styles.plant },
  { id: "rug-box", label: "地毯上的粉礼盒", shortLabel: "地毯这只", position: styles.rug },
] as const;

function GiftRoom({
  selectedId,
  state = "playing",
  onSelect,
  onAssetError,
}: {
  selectedId: FindGiftConfig["targetId"] | null;
  state?: "playing" | "wrong" | "found";
  onSelect?: (target: typeof giftTargets[number]) => void;
  onAssetError: () => void;
}) {
  return (
    <div className={styles.scene}>
      <img
        src="/assets/find-gift/find-gift-room.png"
        alt="温暖房间里有沙发上的绿礼盒、花盆旁的黄礼盒和地毯上的粉礼盒"
        className={styles.sceneImage}
        onError={onAssetError}
      />
      {giftTargets.map((target) => {
        const isSelected = selectedId === target.id;
        const selectedState = isSelected && state === "wrong"
          ? styles.wrong
          : isSelected && state === "found"
            ? styles.found
            : "";
        const label = isSelected && state === "wrong"
          ? `${target.label}，不是这只`
          : isSelected && state === "found"
            ? `${target.label}，惊喜在这里`
            : `选择${target.label}`;

        return (
          <button
            key={target.id}
            type="button"
            onClick={() => onSelect?.(target)}
            disabled={!onSelect}
            aria-label={label}
            className={`${styles.hotspot} ${target.position} ${selectedState}`}
          />
        );
      })}
    </div>
  );
}

function FindGiftGame({
  config,
  onSolved,
  onRuntimeIssue,
}: GameCallbacks & { config: FindGiftConfig }) {
  const [attempts, setAttempts] = useState(0);
  const [lastWrongId, setLastWrongId] = useState<FindGiftConfig["targetId"] | null>(null);
  const [feedback, setFeedback] = useState({
    title: "Tada 陪你一起找",
    message: "三只都很可疑，选你第一眼注意到的那只。",
    showsDirectionHint: false,
  });

  const inspect = (target: typeof giftTargets[number]) => {
    try {
      const nextAttempts = attempts + 1;
      if (target.id === config.targetId) {
        onSolved(nextAttempts);
        return;
      }

      setAttempts(nextAttempts);
      setLastWrongId(target.id);
      setFeedback(getFindGiftWrongFeedback(config.targetId, nextAttempts, target.shortLabel));
    } catch {
      onRuntimeIssue("find-gift-runtime-failed");
    }
  };

  const heading = attempts >= 3 ? "Tada 给你一点线索" : attempts > 0 ? "再找找看" : "礼物会是哪一只？";
  const lead = attempts >= 3
    ? "还没有找到，但你可以继续猜，不会被卡在这里。"
    : attempts > 0
      ? "这只没有打开，房间里还有其他礼物盒。"
      : "点一点房间里的三只礼物盒，看看谁藏着惊喜。";

  return (
    <div className={styles.findGift}>
      <h2>{heading}</h2>
      <p className={styles.lead}>{lead}</p>
      <div className={styles.roundRow}>
        <span>{attempts === 0 ? "还没有猜过" : `已经猜过 ${attempts} 次`}</span>
        <span className={styles.tries} aria-label={`已完成 ${Math.min(attempts, 3)} 次提示进度`}>
          {[1, 2, 3].map((attempt) => (
            <i key={attempt} className={`${styles.tryDot} ${attempts >= attempt ? styles.tryDotUsed : ""}`} />
          ))}
        </span>
      </div>
      <GiftRoom
        selectedId={lastWrongId}
        state={lastWrongId ? "wrong" : "playing"}
        onSelect={inspect}
        onAssetError={() => onRuntimeIssue("find-gift-room-asset-failed")}
      />
      <div
        className={`${styles.feedback} ${attempts > 0 ? styles.feedbackError : ""} ${feedback.showsDirectionHint ? styles.feedbackHint : ""}`}
        role="status"
        aria-live="polite"
      >
        <img
          src="/assets/find-gift/tada-peeking.png"
          alt=""
          className={styles.tadaThumb}
          onError={() => onRuntimeIssue("find-gift-tada-asset-failed")}
        />
        <div>
          <strong>{feedback.title}</strong>
          <p>{feedback.message}</p>
        </div>
      </div>
      <p className={styles.helper}>
        {feedback.showsDirectionHint
          ? "方向提示只用文字表达；正确礼盒不会高亮或被直接点名。"
          : "每只礼物盒都可以点击；猜错不会扣掉机会。"}
      </p>
    </div>
  );
}

function FindGiftSuccessState({
  config,
  attempts,
  disabled,
  onContinue,
  onRuntimeIssue,
}: {
  config: FindGiftConfig;
  attempts: number;
  disabled: boolean;
  onContinue: () => void;
  onRuntimeIssue: (reason: string) => void;
}) {
  const target = giftTargets.find((item) => item.id === config.targetId);
  if (!target) return null;
  const successMessage: Record<FindGiftConfig["targetId"], string> = {
    "sofa-box": "绿礼盒找到了，下一站拆惊喜！",
    "plant-box": "黄礼盒找到了，下一站拆惊喜！",
    "rug-box": "粉礼盒找到了，下一站拆惊喜！",
  };

  return (
    <div className={styles.findGift} aria-live="polite">
      <div className={styles.roundRow}>
        <span>共猜了 {attempts} 次</span>
        <strong className="text-[color-mix(in_srgb,var(--color-mint)_58%,var(--ink))]">解锁成功</strong>
      </div>
      <GiftRoom
        selectedId={config.targetId}
        state="found"
        onAssetError={() => onRuntimeIssue("find-gift-room-asset-failed")}
      />
      <div className={styles.successPanel} role="status">
        <img
          src="/assets/gift/tada-gift-reveal-complete-v2.png"
          alt="Tada 从打开的礼盒里探出身来庆祝"
          className={styles.successArt}
          onError={() => onRuntimeIssue("find-gift-success-asset-failed")}
        />
        <div>
          <h3>Ta-da!</h3>
          <p>{successMessage[target.id]}</p>
        </div>
      </div>
      <ActionButton disabled={disabled} onClick={onContinue}>
        {disabled ? "正在继续…" : "继续"}
      </ActionButton>
    </div>
  );
}

const rpsLabels: Record<RpsChoice, string> = {
  rock: "石头",
  scissors: "剪刀",
  paper: "布",
};

const rpsOrder: RpsChoice[] = ["rock", "scissors", "paper"];

const rpsArtwork: Record<RpsChoice, string> = {
  rock: "/assets/rps/rock.png",
  scissors: "/assets/rps/scissors.png",
  paper: "/assets/rps/paper.png",
};

const rpsSceneArtwork: Record<RpsOutcome | "waiting", string> = {
  waiting: "/assets/rps/tada-card-back.png",
  win: "/assets/rps/tada-card-win.png",
  draw: "/assets/rps/tada-card-draw.png",
  lose: "/assets/rps/tada-card-lose.png",
};

function RpsHand({ choice, onError }: { choice: RpsChoice; onError: () => void }) {
  return <img src={rpsArtwork[choice]} alt="" className={styles.rpsHand} onError={onError} />;
}

function RpsGame({
  onSolved,
  onRuntimeIssue,
}: GameCallbacks & { config: RockPaperScissorsConfig }) {
  const [rounds, setRounds] = useState(0);
  const [selected, setSelected] = useState<RpsChoice | null>(null);
  const [displayChoice, setDisplayChoice] = useState<RpsChoice>("scissors");
  const [phase, setPhase] = useState<"selecting" | "cycling" | "revealing" | "result">("selecting");
  const [result, setResult] = useState<{ player: RpsChoice; opponent: RpsChoice; outcome: RpsOutcome } | null>(null);
  const timers = useRef<number[]>([]);
  const prefersReducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotionPreference, getServerReducedMotionPreference);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const confirm = () => {
    if (!selected || phase !== "selecting") return;
    try {
      const nextRound = rounds + 1;
      const nextResult = getRpsRound(selected, nextRound);
      setRounds(nextRound);
      if (prefersReducedMotion) {
        setDisplayChoice(selected);
        setResult({ player: selected, ...nextResult });
        setPhase("result");
        return;
      }
      setPhase("cycling");
      [0, 110, 220, 350, 510].forEach((delay, index) => timers.current.push(window.setTimeout(() => setDisplayChoice(rpsOrder[index % rpsOrder.length]), delay)));
      timers.current.push(window.setTimeout(() => { setDisplayChoice(selected); setPhase("revealing"); }, 650));
      timers.current.push(window.setTimeout(() => { setResult({ player: selected, ...nextResult }); setPhase("result"); }, 980));
    } catch {
      onRuntimeIssue("rps-runtime-failed");
    }
  };

  const retry = () => { setSelected(null); setResult(null); setPhase("selecting"); };
  const resultCopy = result?.outcome === "win" ? "你赢啦！点击打开惊喜" : result?.outcome === "draw" ? "平局耶！重新选一张吧" : "差一点，再试一次";
  const retryCopy = result?.outcome === "draw" ? "平局耶！再来一次" : "差一点，再试一次";

  return (
    <div className={styles.rpsGame}>
      <p className={styles.rpsEyebrow}>面对面对决桌</p><h2>和 Tada 猜一拳</h2><p className={styles.rpsLead}>选一张，看看 Tada 会出什么</p>
      <div className={styles.rpsDuel}>
        <div className={`${styles.rpsOpponent} ${phase === "revealing" || phase === "result" ? styles.rpsOpponentRevealed : ""}`}>
          <div className={styles.rpsCardFlip}>
            <div className={`${styles.rpsCardFace} ${styles.rpsCardBack}`}><img src={rpsSceneArtwork.waiting} alt="Tada 手捧暗牌" onError={() => onRuntimeIssue("rps-artwork-failed")} /></div>
            <div className={`${styles.rpsCardFace} ${styles.rpsCardFront}`}>
              <img src={rpsSceneArtwork[result?.outcome ?? "draw"]} alt="" onError={() => onRuntimeIssue("rps-artwork-failed")} />
              <div className={styles.rpsRevealContent}><RpsHand choice={result?.opponent ?? "rock"} onError={() => onRuntimeIssue("rps-artwork-failed")} /><strong>{rpsLabels[result?.opponent ?? "rock"]}</strong></div>
            </div>
          </div>
        </div>
      </div>
      <div className={`${styles.rpsChoices} ${phase === "cycling" ? styles.rpsCycling : ""}`} role="group" aria-label="选择你的出拳">
        {rpsOrder.map((choice) => <button key={choice} type="button" disabled={phase !== "selecting"} onClick={() => setSelected(choice)} aria-pressed={selected === choice} className={`${styles.rpsChoice} ${(phase === "cycling" ? displayChoice : selected) === choice ? styles.rpsChoiceSelected : ""}`}><RpsHand choice={choice} onError={() => onRuntimeIssue("rps-artwork-failed")} /><span>{rpsLabels[choice]}</span></button>)}
      </div>
      <p className={`${styles.rpsStatus} ${phase === "result" ? styles.rpsStatusResult : ""}`} aria-live="polite">{phase === "cycling" ? "出拳中…" : phase === "revealing" ? "Tada 要翻牌啦…" : phase === "result" ? resultCopy : selected ? `你选了${rpsLabels[selected]}，准备好就出拳` : "先选一张牌"}</p>
      {phase === "selecting" ? <button type="button" disabled={!selected} onClick={confirm} className={styles.rpsAction}>确定出拳</button> : phase === "result" && result?.outcome !== "win" ? <button type="button" onClick={retry} className={styles.rpsAction}>{retryCopy}</button> : phase === "result" ? <button type="button" onClick={() => onSolved(rounds)} className={styles.rpsAction}>打开惊喜</button> : null}
    </div>
  );
}

type MicrophoneState = "idle" | "requesting" | "listening" | "unavailable";
type MicrophoneIssue = "denied" | "unavailable" | null;

const flamePositions = [styles.flameOne, styles.flameTwo, styles.flameThree];

function CandleScene({
  extinguishedCount,
  isBlowing = false,
  isSuccess = false,
  onRuntimeIssue,
}: {
  extinguishedCount: number;
  isBlowing?: boolean;
  isSuccess?: boolean;
  onRuntimeIssue: (reason: string) => void;
}) {
  const sceneLabel = extinguishedCount === 0
    ? "Tada 陪在蛋糕旁，三支生日蜡烛都亮着"
    : extinguishedCount === 3
      ? "Tada 陪在蛋糕旁，三支生日蜡烛已经全部熄灭"
      : `Tada 陪在蛋糕旁，三支生日蜡烛已经熄灭 ${extinguishedCount} 支`;

  return (
    <div
      className={`${styles.candleScene} ${isBlowing ? styles.candleSceneBlowing : ""} ${isSuccess ? styles.candleSceneSuccess : ""}`}
      role="img"
      aria-label={sceneLabel}
    >
      <img
        src="/assets/blow-candles/blow-candles-preview.png"
        alt=""
        className={styles.candleSceneBase}
        onError={() => onRuntimeIssue("blow-candles-scene-asset-failed")}
      />
      {flamePositions.map((position, index) => {
        const isOut = index < extinguishedCount;
        return (
          <span key={position} className={`${styles.flameAnchor} ${position}`} aria-hidden="true">
            <img
              src="/assets/blow-candles/flame-sprite.png"
              alt=""
              className={`${styles.flame} ${isOut ? styles.flameOut : ""}`}
              onError={() => onRuntimeIssue("blow-candles-flame-asset-failed")}
            />
            <i className={`${styles.smoke} ${isOut ? styles.smokeVisible : ""}`} />
          </span>
        );
      })}
      {isSuccess ? (
        <div className={styles.sceneCelebration} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      ) : null}
    </div>
  );
}

function BlowCandlesGame({
  onSolved,
  onRuntimeIssue,
}: GameCallbacks & { config: BlowCandlesConfig }) {
  const [blowDurationMs, setBlowDurationMs] = useState(0);
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>("idle");
  const [microphoneIssue, setMicrophoneIssue] = useState<MicrophoneIssue>(null);
  const [isBlowing, setIsBlowing] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const mountedRef = useRef(false);
  const blowDurationRef = useRef(0);
  const completedRef = useRef(false);
  const microphoneRequestRef = useRef(0);
  const microphoneFrameRef = useRef<number | null>(null);
  const pressFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const stopMicrophone = useCallback(() => {
    microphoneRequestRef.current += 1;
    if (microphoneFrameRef.current !== null) {
      window.cancelAnimationFrame(microphoneFrameRef.current);
      microphoneFrameRef.current = null;
    }
    const stream = streamRef.current;
    streamRef.current = null;
    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    releaseMicrophoneResources(stream, audioContext);
  }, []);

  const finish = useCallback((usedFallback: boolean) => {
    if (completedRef.current) return;
    completedRef.current = true;
    blowDurationRef.current = BLOW_CANDLES_COMPLETION_MS;
    setBlowDurationMs(BLOW_CANDLES_COMPLETION_MS);
    setIsBlowing(false);
    setIsPressing(false);
    stopMicrophone();
    onSolved(1, usedFallback);
  }, [onSolved, stopMicrophone]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopMicrophone();
      if (pressFrameRef.current !== null) {
        window.cancelAnimationFrame(pressFrameRef.current);
      }
    };
  }, [stopMicrophone]);

  const startMicrophone = async () => {
    if (completedRef.current || microphoneState === "requesting" || microphoneState === "listening") {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof window.AudioContext === "undefined") {
      setMicrophoneState("unavailable");
      setMicrophoneIssue("unavailable");
      return;
    }

    const requestId = microphoneRequestRef.current + 1;
    microphoneRequestRef.current = requestId;
    const requestIsActive = () => isMicrophoneRequestActive({
      requestId,
      activeRequestId: microphoneRequestRef.current,
      mounted: mountedRef.current,
      completed: completedRef.current,
      fallbackActive: pressFrameRef.current !== null,
    });
    let localStream: MediaStream | null = null;
    let localAudioContext: AudioContext | null = null;
    let released = false;
    const releaseLocalResources = () => {
      if (released) return;
      released = true;
      if (streamRef.current === localStream) streamRef.current = null;
      if (audioContextRef.current === localAudioContext) audioContextRef.current = null;
      releaseMicrophoneResources(localStream, localAudioContext);
    };

    setMicrophoneState("requesting");
    setMicrophoneIssue(null);

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
      if (!requestIsActive()) {
        releaseLocalResources();
        return;
      }
      localAudioContext = new window.AudioContext();
      if (!requestIsActive()) {
        releaseLocalResources();
        return;
      }
      streamRef.current = localStream;
      audioContextRef.current = localAudioContext;
      await localAudioContext.resume();
      if (!requestIsActive()) {
        releaseLocalResources();
        return;
      }
      const analyser = localAudioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.35;
      localAudioContext.createMediaStreamSource(localStream).connect(analyser);

      if (!requestIsActive()) {
        releaseLocalResources();
        return;
      }
      setMicrophoneState("listening");

      const samples = new Uint8Array(analyser.fftSize);
      let sustainedBlowMs = blowDurationRef.current;
      let previousTime = performance.now();
      let wasBlowing = false;

      const listen = (time: number) => {
        if (!requestIsActive()) {
          releaseLocalResources();
          return;
        }
        const elapsed = Math.min(64, Math.max(0, time - previousTime));
        previousTime = time;
        analyser.getByteTimeDomainData(samples);

        let sumSquares = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        const hasBlow = rms >= 0.075;

        if (hasBlow !== wasBlowing) {
          wasBlowing = hasBlow;
          setIsBlowing(hasBlow);
        }

        sustainedBlowMs = hasBlow
          ? Math.min(BLOW_CANDLES_COMPLETION_MS, sustainedBlowMs + elapsed)
          : Math.max(
              getLastExtinguishedThreshold(sustainedBlowMs),
              sustainedBlowMs - elapsed * 1.8,
            );
        blowDurationRef.current = sustainedBlowMs;
        setBlowDurationMs(Math.round(sustainedBlowMs));

        if (sustainedBlowMs >= BLOW_CANDLES_COMPLETION_MS) {
          finish(false);
          return;
        }
        microphoneFrameRef.current = window.requestAnimationFrame(listen);
      };

      if (requestIsActive()) {
        microphoneFrameRef.current = window.requestAnimationFrame(listen);
      } else {
        releaseLocalResources();
      }
    } catch (error) {
      releaseLocalResources();
      if (!requestIsActive()) return;
      setIsBlowing(false);
      setMicrophoneState("unavailable");
      const permissionDenied = error instanceof DOMException
        && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setMicrophoneIssue(permissionDenied ? "denied" : "unavailable");
    }
  };

  const stopPress = useCallback(() => {
    if (pressFrameRef.current !== null) {
      window.cancelAnimationFrame(pressFrameRef.current);
      pressFrameRef.current = null;
    }
    setIsPressing(false);
    setIsBlowing(false);
    if (!completedRef.current && blowDurationRef.current < BLOW_CANDLES_COMPLETION_MS) {
      const preservedDuration = getLastExtinguishedThreshold(blowDurationRef.current);
      blowDurationRef.current = preservedDuration;
      setBlowDurationMs(preservedDuration);
    }
  }, []);

  const startPress = useCallback(() => {
    if (completedRef.current || pressFrameRef.current !== null) return;
    stopMicrophone();
    setMicrophoneState((state) => state === "listening" || state === "requesting" ? "idle" : state);
    setIsPressing(true);
    setIsBlowing(true);
    const startedAt = performance.now() - blowDurationRef.current;

    const advance = (time: number) => {
      const nextDuration = Math.min(
        BLOW_CANDLES_COMPLETION_MS,
        Math.round(time - startedAt),
      );
      blowDurationRef.current = nextDuration;
      setBlowDurationMs(nextDuration);
      if (nextDuration >= BLOW_CANDLES_COMPLETION_MS) {
        pressFrameRef.current = null;
        finish(true);
        return;
      }
      pressFrameRef.current = window.requestAnimationFrame(advance);
    };

    pressFrameRef.current = window.requestAnimationFrame(advance);
  }, [finish, stopMicrophone]);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    startPress();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) {
      event.preventDefault();
      startPress();
    }
  };

  const extinguishedCandles = getExtinguishedCandleCount(blowDurationMs);
  const progress = getBlowProgress(blowDurationMs);
  const statusText = isPressing
    ? extinguishedCandles === 0
      ? "保持按住，第一支火苗正在变小"
      : `保持按住，已经吹灭 ${extinguishedCandles} 支`
    : microphoneState === "requesting"
      ? "正在请求麦克风权限…"
      : microphoneState === "listening"
        ? isBlowing
          ? `吹气中，已经吹灭 ${extinguishedCandles} 支`
          : "正在听…"
        : extinguishedCandles > 0
          ? `已经吹灭 ${extinguishedCandles} / 3 支`
          : "三支蜡烛都亮着";

  return (
    <div className={styles.blowCandles}>
      <h2>许个愿吧</h2>
      <p className={styles.blowLead}>
        {microphoneState === "unavailable"
          ? "没关系，按住也能吹灭三支蜡烛"
          : microphoneState === "listening"
            ? "靠近一点，轻轻吹一口气"
            : "吹灭三支蜡烛，就能打开惊喜"}
      </p>

      <CandleScene
        extinguishedCount={extinguishedCandles}
        isBlowing={isBlowing}
        onRuntimeIssue={onRuntimeIssue}
      />

      <div className={styles.candleStatus}>
        <div className={styles.candleDots} aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <i key={index} className={index < extinguishedCandles ? styles.candleDotOut : ""} />
          ))}
        </div>
        <p role="status" aria-live="polite">{statusText}</p>
        <span className={styles.srProgress}>吹气进度 {progress}%</span>
      </div>

      <button
        type="button"
        onClick={startMicrophone}
        disabled={microphoneState === "requesting" || microphoneState === "listening" || isPressing}
        className={`${styles.microphoneButton} ${microphoneState === "unavailable" ? styles.microphoneButtonSecondary : ""}`}
      >
        {microphoneState === "requesting"
          ? "正在请求麦克风…"
          : microphoneState === "listening"
            ? "正在听，可以开始吹气"
            : microphoneState === "unavailable"
              ? "重新开启麦克风"
              : "开启麦克风"}
      </button>

      {microphoneIssue ? (
        <p className={styles.microphoneIssue} role="alert">
          {microphoneIssue === "denied"
            ? "没有开启麦克风，也可以按住吹气。"
            : "当前设备无法使用麦克风，也可以按住吹气。"}
        </p>
      ) : null}

      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={stopPress}
        onPointerCancel={stopPress}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") stopPress();
        }}
        onBlur={stopPress}
        className={`${styles.holdButton} ${microphoneState === "unavailable" ? styles.holdButtonPrimary : ""} ${isPressing ? styles.holdButtonActive : ""}`}
        aria-label="按住吹气，持续一秒多就能吹灭蜡烛"
      >
        {isPressing ? "保持按住…" : "不方便吹？按住吹气"}
      </button>

    </div>
  );
}

function BlowCandlesSuccessState({
  disabled,
  onContinue,
  onRuntimeIssue,
}: {
  disabled: boolean;
  onContinue: () => void;
  onRuntimeIssue: (reason: string) => void;
}) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    getServerReducedMotionPreference,
  );
  const [celebrationComplete, setCelebrationComplete] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;
    const timer = window.setTimeout(() => setCelebrationComplete(true), 1100);
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion]);

  const canContinue = prefersReducedMotion || celebrationComplete;

  return (
    <div className={styles.blowCandlesSuccess} aria-live="polite">
      <h2>蜡烛吹灭啦</h2>
      <p className={styles.blowLead}>愿望已经替你好好收下</p>
      <div className={styles.successSceneWrap}>
        <CandleScene
          extinguishedCount={3}
          isSuccess
          onRuntimeIssue={onRuntimeIssue}
        />
        <p className={styles.unlockBadge}>
          <span aria-hidden="true">✦</span>
          惊喜已解锁
        </p>
      </div>
      <ActionButton disabled={disabled || !canContinue} onClick={onContinue}>
        {!canContinue ? "愿望收好啦…" : disabled ? "正在继续…" : "继续拆惊喜"}
      </ActionButton>
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
      className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-[var(--radius-round)] border-0 bg-[var(--coral-action)] px-5 font-bold text-[var(--on-dark)] shadow-[var(--shadow-pressed)] outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--coral)_24%,transparent)] active:translate-y-px active:shadow-none disabled:cursor-wait disabled:bg-[var(--coral-action)] disabled:text-[var(--on-dark)] disabled:opacity-65"
    >
      {children}
    </button>
  );
}
