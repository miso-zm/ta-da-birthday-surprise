"use client";

import { useState } from "react";

export function ManageControls({ publicationId }: { publicationId: string }) {
  const [state, setState] = useState<"ready" | "working" | "revoked" | "error">("ready");

  async function revoke() {
    if (!window.confirm("撤回后，收礼人将立即无法再查看这份惊喜。确定撤回吗？")) return;
    setState("working");
    try {
      const response = await fetch(`/api/manage/${publicationId}/revoke`, {
        method: "POST",
        credentials: "same-origin",
      });
      setState(response.ok ? "revoked" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "revoked") {
    return <p className="mt-6 text-center font-bold text-[var(--coral-dark)]">这份惊喜已经撤回。</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={revoke}
        disabled={state === "working"}
        className="mt-6 min-h-12 w-full rounded-[var(--radius-round)] bg-[var(--coral-action)] px-5 font-bold text-[var(--on-dark)] disabled:opacity-60"
      >
        {state === "working" ? "正在撤回…" : "撤回这份惊喜"}
      </button>
      <p aria-live="polite" className="min-h-8 pt-3 text-center text-sm font-bold text-[var(--muted)]">
        {state === "error" ? "撤回没有完成，请确认还在原发布浏览器中并稍后重试。" : ""}
      </p>
    </>
  );
}
