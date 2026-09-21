"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./manage-controls.module.css";
import { forgetPublishedWork } from "@/lib/published-work-storage";
import { useRouter } from "next/navigation";

export function ManageControls({ publicationId, initialStatus }: { publicationId: string; initialStatus: "active" | "revoked" | "expired" }) {
  const router = useRouter();
  const [state, setState] = useState<"ready" | "working" | "revoked" | "deleted" | "error">(initialStatus === "active" ? "ready" : "revoked");
  const [mode, setMode] = useState<"revoke" | "delete" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestInFlight = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!mode || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [mode]);

  function dismiss() {
    if (!requestInFlight.current) setMode(null);
  }

  async function submit() {
    if (!mode) return;
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setState("working");
    try {
      const response = await fetch(`/api/manage/${publicationId}/${mode}`, {
        method: "POST",
        credentials: "same-origin",
      });
      setState(response.ok ? mode === "delete" ? "deleted" : "revoked" : "error");
      if (response.ok) {
        if (mode === "delete") {
          forgetPublishedWork(window.localStorage, publicationId, window.location.origin);
          router.refresh();
        }
        setMode(null);
      }
    } catch {
      setState("error");
    } finally {
      requestInFlight.current = false;
    }
  }

  if (state === "deleted") {
    return <p role="status" className="mt-6 text-center font-bold text-[var(--coral-dark)]">已永久删除已发布内容和服务器照片。</p>;
  }

  return (
    <>
      {state !== "revoked" ? <button
        type="button"
        onClick={() => { setState("ready"); setMode("revoke"); }}
        disabled={state === "working"}
        className="mt-6 min-h-12 w-full rounded-[var(--radius-round)] bg-[var(--coral-action)] px-5 font-bold text-[var(--on-dark)] disabled:opacity-60"
      >收回这份心意</button> : <p role="status" className="mt-6 text-center font-bold text-[var(--coral-dark)]">这份心意已经收回，服务器内容仍保留至原到期日。</p>}
      <button type="button" className={styles.deleteButton} onClick={() => { setState(state === "revoked" ? "revoked" : "ready"); setMode("delete"); }} disabled={state === "working"}>永久删除</button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => { event.preventDefault(); dismiss(); }}
        onClose={() => setMode(null)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
        }}
      >
        <section className={styles.paper} aria-busy={state === "working"}>
          <button type="button" className={styles.close} aria-label="关闭弹窗" onClick={dismiss} disabled={state === "working"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <Image src="/assets/tada/tada-holding-keepsake-v1.png" alt="" width={116} height={116} className={styles.hero} />
          <h2 id={titleId} className={styles.title}>{mode === "delete" ? "要永久删除吗？" : "要收回这份心意吗？"}</h2>
          <p id={descriptionId} className={styles.copy}>{mode === "delete" ? "已发布内容和服务器照片将被永久删除，且无法恢复。本机草稿不受影响。" : <>收回后，对方将无法再通过链接查看。<br />服务器内容仍会保留，之后可永久删除。</>}</p>
          {state === "error" ? <p role="alert" className={styles.error}>操作没有完成，请确认使用原发布浏览器，再试一次。</p> : null}
          <div className={styles.actions}>
            <button type="button" autoFocus className={styles.primary} onClick={dismiss} disabled={state === "working"}>先留着</button>
            <button type="button" className={styles.secondary} onClick={submit} disabled={state === "working"}>
              {state === "working" ? "正在处理…" : mode === "delete" ? "永久删除" : "确认收回"}
            </button>
          </div>
          <span role="status" className="sr-only">{state === "working" ? "正在处理，请稍候。" : ""}</span>
        </section>
      </dialog>
    </>
  );
}
