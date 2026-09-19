"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./manage-controls.module.css";

export function ManageControls({ publicationId }: { publicationId: string }) {
  const [state, setState] = useState<"ready" | "working" | "revoked" | "error">("ready");
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestInFlight = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function dismiss() {
    if (!requestInFlight.current) setOpen(false);
  }

  async function revoke() {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setState("working");
    try {
      const response = await fetch(`/api/manage/${publicationId}/revoke`, {
        method: "POST",
        credentials: "same-origin",
      });
      setState(response.ok ? "revoked" : "error");
      if (response.ok) setOpen(false);
    } catch {
      setState("error");
    } finally {
      requestInFlight.current = false;
    }
  }

  if (state === "revoked") {
    return <p role="status" className="mt-6 text-center font-bold text-[var(--coral-dark)]">这份心意已经收回。</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setState("ready"); setOpen(true); }}
        disabled={state === "working"}
        className="mt-6 min-h-12 w-full rounded-[var(--radius-round)] bg-[var(--coral-action)] px-5 font-bold text-[var(--on-dark)] disabled:opacity-60"
      >
        收回这份心意
      </button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => { event.preventDefault(); dismiss(); }}
        onClose={() => setOpen(false)}
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
          <h2 id={titleId} className={styles.title}>要收回这份心意吗？</h2>
          <p id={descriptionId} className={styles.copy}>收回后，对方将无法再通过链接查看。<br />你的草稿会保留。</p>
          {state === "error" ? <p role="alert" className={styles.error}>收回没有完成，请确认使用原发布浏览器，再试一次。</p> : null}
          <div className={styles.actions}>
            <button type="button" autoFocus className={styles.primary} onClick={dismiss} disabled={state === "working"}>先留着</button>
            <button type="button" className={styles.secondary} onClick={revoke} disabled={state === "working"}>
              {state === "working" ? "正在收回…" : state === "error" ? "重试收回" : "确认收回"}
            </button>
          </div>
          <span role="status" className="sr-only">{state === "working" ? "正在收回这份心意，请稍候。" : ""}</span>
        </section>
      </dialog>
    </>
  );
}
