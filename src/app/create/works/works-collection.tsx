"use client";

import Image from "next/image";
import { ArrowLeft, Plus, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { SenderDraft } from "@/lib/surprise-contract";
import type { ManagedPublication } from "@/lib/persistence/types";
import { getBrowserDraftStorage, loadSenderDraft } from "@/lib/sender-draft-storage";
import { readPublishedWorks, type PublishedWork } from "@/lib/published-work-storage";
import styles from "../collection.module.css";

type Work = PublishedWork & { status: ManagedPublication["status"]; createdAt: string };
function WorkCover({ kind, label }: { kind: "card" | "scrapbook"; label?: string }) {
  return <div className={styles.cover}><svg viewBox="0 0 64 76" fill="none" aria-hidden="true">
    <rect x="9" y="8" width="46" height="59" rx="4" fill="var(--color-on-dark)" stroke="currentColor" strokeWidth="1.5" />
    {kind === "card" ? <><path d="M20 32h24M20 39h20M20 46h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M32 23c-8-7-12 4 0 10 12-6 8-17 0-10Z" fill="var(--color-coral-action)" /></> : <><rect x="18" y="22" width="28" height="29" rx="2" fill="var(--color-mint)" opacity=".35" /><circle cx="38" cy="30" r="3" fill="var(--color-on-dark)" /><path d="m19 47 9-12 8 9 5-5 5 8" stroke="currentColor" strokeWidth="1.5" /><path d="M23 58h18" stroke="currentColor" strokeLinecap="round" /></>}
    <path d="m21 5 22 2-1 8-22-2Z" fill="var(--color-coral-action)" opacity=".55" />
  </svg>{label ? <span className={styles.badge}>{label}</span> : null}</div>;
}
export function WorksCollection() {
  const storageDialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"draft" | "published">("draft");
  const [draft, setDraft] = useState<SenderDraft | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setNotice("");
      const storage = getBrowserDraftStorage();
      if (!storage) {
        setNotice("当前浏览器无法读取保存记录。已有管理链接仍可单独打开。");
        setLoading(false);
        return;
      }
      const loadedDraft = loadSenderDraft(storage);
      setDraft(loadedDraft.status === "ready" ? loadedDraft.draft : null);
      if (loadedDraft.status === "invalid") setNotice(loadedDraft.reason);
      const saved = readPublishedWorks(storage, window.location.origin);
      if (!saved.length) { setWorks([]); setLoading(false); return; }
      try {
        const response = await fetch("/api/manage/list", {
          method: "POST", credentials: "same-origin", signal: controller.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: saved.map((work) => work.publicationId) }),
        });
        if (!response.ok) throw new Error("暂时无法读取已发布作品，请重试。");
        const result = await response.json() as { works: ManagedPublication[] };
        if (controller.signal.aborted) return;
        const managed = new Map(result.works.map((work) => [work.id, work]));
        setWorks(saved.flatMap((work) => {
          const current = managed.get(work.publicationId);
          return current ? [{ ...work, ...current }] : [];
        }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
        if (managed.size < saved.length) setNotice("部分作品无法从当前浏览器管理。清除浏览器数据后，管理权暂时无法找回。");
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "暂时无法读取作品，请重试。");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  async function copy(work: Work) {
    try { await navigator.clipboard.writeText(work.shareUrl); setFeedback("链接已复制"); }
    catch { setFeedback("暂时无法复制，请打开查看页后复制浏览器地址。"); }
  }

  return <main className={styles.page}>
    <header className={styles.header}><a href="/create"><ArrowLeft size={20} weight="regular" aria-hidden="true" />返回首页</a><a className={styles.createLink} href="/create#draft"><Plus size={20} weight="regular" aria-hidden="true" />继续创建</a></header>
    <div className={styles.collectionHeading}><div className={styles.headingCopy}><h1>我的作品</h1><p>亲手准备的生日快乐，<br />都收在这里。</p></div><div className={styles.companion}><Image src="/assets/gift/tada-collection-cutout-v1.png" alt="Tada 从礼盒里开心地蹦出来" width={116} height={116} /></div></div>
    <div className={styles.tabs} role="tablist" aria-label="作品类型">
      <button type="button" role="tab" id="draft-tab" aria-selected={tab === "draft"} aria-controls="draft-panel" onClick={() => setTab("draft")}>草稿</button>
      <button type="button" role="tab" id="published-tab" aria-selected={tab === "published"} aria-controls="published-panel" onClick={() => setTab("published")}>已发布</button>
    </div>
    {tab === "draft" ? <section role="tabpanel" id="draft-panel" aria-labelledby="draft-tab">
      {draft ? <article className={styles.workCard}><div className={styles.workTop}><WorkCover kind={draft.memoryKind} label="未发布" /><div className={styles.workCopy}><h2>给 {draft.basics.recipientName || "朋友"} 的生日{draft.memoryKind === "scrapbook" ? "手帐" : "贺卡"}</h2><p>上次保存于 {new Date(draft.updatedAt).toLocaleDateString("zh-CN")}</p></div></div><a className={styles.action} href="/create#draft">继续编辑</a></article> : !loading ? <div className={styles.empty}><WorkCover kind="card" /><h2>还没有留下草稿</h2><p>准备一份生日快乐，写到一半也能回来继续。</p><a className={styles.action} href="/create">开始准备</a></div> : null}
    </section> : <section role="tabpanel" id="published-panel" aria-labelledby="published-tab">
      {!loading && !error && !works.length ? <div className={styles.empty}><h2>还没有可管理的作品</h2><p>从这个浏览器发布后，就会在这里留下入口。</p><a className={styles.action} href="/create">准备一份生日快乐</a></div> : null}
      {works.map((work) => <article className={styles.workCard} data-status={work.status} key={work.publicationId}>
        <div className={styles.workTop}><WorkCover kind={work.memoryKind} label={work.status === "active" ? "已发布" : work.status === "expired" ? "已到期" : "已收回"} /><div className={styles.workCopy}><h2>给 {work.recipientName || "朋友"} 的生日{work.memoryKind === "scrapbook" ? "手帐" : "贺卡"}</h2>
        <p>{work.status === "active" ? `有效期至 ${new Date(work.expiresAt).toLocaleDateString("zh-CN")}` : "旧链接已无法查看"}</p></div></div>
        <div className={styles.workActions}>{work.status === "active" ? <><button type="button" onClick={() => void copy(work)}>复制链接</button><a href={work.shareUrl} target="_blank" rel="noopener noreferrer">查看效果</a></> : null}<a href={work.manageUrl}>管理作品</a></div>
      </article>)}
      {error ? <div className={styles.empty}><p role="alert">{error}</p><button className={styles.action} type="button" onClick={() => setRetry((value) => value + 1)}>重新加载</button></div> : null}
    </section>}
    {loading ? <p role="status" className={styles.note}>正在整理你的作品…</p> : null}
    <p role="status" className={styles.note}>{feedback}</p>
    {notice ? <p className={styles.note}>{notice}</p> : null}
    <button className={styles.storageNote} type="button" aria-haspopup="dialog" onClick={() => storageDialog.current?.showModal()}>关于保存记录</button>
    <dialog ref={storageDialog} className={styles.storageDialog} aria-labelledby="storage-dialog-title" aria-describedby="storage-dialog-description" onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close(); } }}>
      <button className={styles.dialogClose} type="button" aria-label="关闭" onClick={() => storageDialog.current?.close()}><X size={22} aria-hidden="true" /></button>
      <h2 id="storage-dialog-title">关于保存记录</h2>
      <div id="storage-dialog-description"><p>草稿和最近 100 个发布入口，仅保存在当前浏览器。</p><p>换设备或清除浏览器数据后，暂时无法找回。请妥善保留作品的管理链接。</p></div>
      <button className={styles.action} type="button" onClick={() => storageDialog.current?.close()}>知道了</button>
    </dialog>
  </main>;
}
