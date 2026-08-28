"use client";

import { useRef, useState } from "react";
import type { UnlockConfig, UnlockResult } from "@/lib/surprise-contract";
import { PrimaryButton, StageCard } from "@/features/shared/placeholders";

type UnlockGameProps = {
  config: UnlockConfig;
  onComplete: (result: UnlockResult) => void;
  onFallback: (reason: string) => void;
};

const labels: Record<UnlockConfig["kind"], string> = {
  "find-gift": "找礼物",
  rps: "剪刀石头布",
  "birthday-password": "生日密码",
};

export function UnlockGame({ config, onComplete, onFallback }: UnlockGameProps) {
  const completed = useRef(false);
  const [failed, setFailed] = useState(false);

  const complete = () => {
    if (completed.current) return;
    completed.current = true;
    onComplete({ kind: config.kind, attempts: 1, usedFallback: false });
  };

  return (
    <StageCard label="Unlock Game 占位模块">
      <div className="mt-5 aspect-[4/3] rounded-[20px] border-2 border-dashed border-[var(--line)] bg-[#f6ead6] p-5">
        <div className="flex h-full items-center justify-center text-center">
          <div>
            <p className="text-2xl font-black">{labels[config.kind]}</p>
            <p className="mt-2 text-sm font-semibold leading-5 text-[var(--muted)]">这里将在模块任务中替换为可玩的正式小游戏。</p>
          </div>
        </div>
      </div>
      {!failed ? (
        <>
          <PrimaryButton onClick={complete}>模拟完成小游戏</PrimaryButton>
          <button type="button" onClick={() => setFailed(true)} className="mt-3 min-h-11 w-full rounded-[16px] text-sm font-bold text-[var(--muted)] underline underline-offset-4">
            模拟资源加载失败
          </button>
        </>
      ) : (
        <div className="mt-5 rounded-[18px] bg-[#f7e2dd] p-4">
          <p className="text-sm font-bold">游戏资源暂时没有加载成功。</p>
          <button type="button" onClick={() => onFallback("game-resource-failed")} className="mt-3 min-h-11 w-full rounded-[16px] border-2 border-[var(--line)] bg-[var(--paper)] px-4 font-extrabold">
            跳过并继续
          </button>
        </div>
      )}
    </StageCard>
  );
}
