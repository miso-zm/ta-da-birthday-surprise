"use client";

import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import type { PortraitTemplateId, PortraitTransform, SenderPortraitDraft } from "../../lib/surprise-contract";
import { removePortraitBackground, type PortraitPhase } from "../../lib/portrait/remove-background";
import { createPortraitSticker } from "../../lib/portrait/sticker";
import {
  balloonTemplate,
  blueTemplate,
  clampPlacement,
  composePortraitTemplate,
} from "../../lib/portrait/template";
import { PortraitTaskLifecycle, type PortraitTask } from "./portrait-task-lifecycle";
import styles from "./portrait-editor.module.css";

type PortraitEditorProps = {
  value?: SenderPortraitDraft;
  recipientName: string;
  onChange: (value?: SenderPortraitDraft) => void;
  onBusyChange?: (busy: boolean) => void;
};

const TEMPLATE_OPTIONS = [
  {
    id: "balloon" as const,
    name: "气球派对",
    description: "彩色气球、礼物和蛋糕",
    thumbnail: "/assets/portrait/balloon/background-v1.png",
  },
  {
    id: "blue" as const,
    name: "蓝调生日",
    description: "蓝白剪纸、星光和小贴纸",
    thumbnail: "/assets/portrait/blue/background-v1.png",
  },
];

function defaultTransform(templateId: PortraitTemplateId): PortraitTransform {
  const source = templateId === "blue" ? blueTemplate.portrait : balloonTemplate.portrait;
  return { ...source };
}

function abortError() {
  return new DOMException("已取消", "AbortError");
}

function blobToDataUrl(blob: Blob, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let settled = false;
    const finish = (error?: Error, value?: string) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      if (error) reject(error); else resolve(value!);
    };
    const onAbort = () => {
      if (reader.readyState === FileReader.LOADING) reader.abort();
      finish(abortError());
    };
    if (signal?.aborted) return finish(abortError());
    signal?.addEventListener("abort", onAbort, { once: true });
    reader.onerror = () => finish(new Error("图片暂时无法保存，请重试。"));
    reader.onabort = () => finish(abortError());
    reader.onload = () => typeof reader.result === "string"
      ? finish(undefined, reader.result)
      : finish(new Error("图片暂时无法保存，请重试。"));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(value: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(value, { signal });
  if (!response.ok) throw new Error("已处理的照片无法读取，请重新选择。");
  return response.blob();
}

function isAbortError(value: unknown) {
  return value instanceof DOMException && value.name === "AbortError";
}

function phaseLabel(phase: PortraitPhase | "composing" | null) {
  if (phase === "decoding") return "正在读取照片…";
  if (phase === "loading") return "正在准备本地抠图组件…";
  if (phase === "processing") return "正在本地抠出人物…";
  if (phase === "finishing") return "正在处理剪纸边缘…";
  if (phase === "composing") return "正在放入生日模板…";
  return "";
}

export function PortraitEditor({ value, recipientName, onChange, onBusyChange }: PortraitEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [lifecycle] = useState(() => new PortraitTaskLifecycle());
  const onBusyChangeRef = useRef(onBusyChange);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    start: PortraitTransform;
    width: number;
    height: number;
  } | null>(null);
  const [phase, setPhase] = useState<PortraitPhase | "composing" | null>(null);
  const [error, setError] = useState("");
  const [placement, setPlacement] = useState<PortraitTransform>(() => value?.transform ?? defaultTransform("balloon"));
  const [previewUrl, setPreviewUrl] = useState(value?.posterImageUrl ?? "");
  const placementRef = useRef(placement);

  function updatePlacement(nextPlacement: PortraitTransform) {
    placementRef.current = nextPlacement;
    setPlacement(nextPlacement);
  }

  useEffect(() => {
    onBusyChangeRef.current = onBusyChange;
  }, [onBusyChange]);

  useEffect(() => () => {
    // Cancel is reusable so React development-mode effect replay does not
    // leave this mounted editor with a permanently disposed coordinator.
    lifecycle.cancel();
    onBusyChangeRef.current?.(false);
  }, [lifecycle]);

  useEffect(() => {
    onBusyChange?.(Boolean(phase));
  }, [onBusyChange, phase]);

  function cancelCurrentTask() {
    lifecycle.cancel();
    setPhase(null);
  }

  async function compose(task: PortraitTask, stickerImageUrl: string, templateId: PortraitTemplateId, nextPlacement: PortraitTransform) {
    if (!lifecycle.isCurrent(task)) return;
    setPhase("composing");
    setError("");
    try {
      const result = await composePortraitTemplate({
        sticker: await dataUrlToBlob(stickerImageUrl, task.signal),
        template: templateId,
        portrait: nextPlacement,
        signal: task.signal,
      });
      const posterImageUrl = await blobToDataUrl(result.blob, task.signal);
      if (!lifecycle.isCurrent(task)) return;
      setPreviewUrl(posterImageUrl);
      onChange({
        templateId,
        stickerImageUrl,
        posterImageUrl,
        transform: result.portrait,
      });
    } catch (caught) {
      if (isAbortError(caught) || !lifecycle.isCurrent(task)) return;
      setError(caught instanceof Error ? caught.message : "模板暂时没有生成，请重试。");
    } finally {
      if (lifecycle.settle(task)) setPhase(null);
    }
  }

  function startCompose(stickerImageUrl: string, templateId: PortraitTemplateId, nextPlacement: PortraitTransform) {
    const task = lifecycle.begin();
    void compose(task, stickerImageUrl, templateId, nextPlacement);
  }

  function scheduleCompose(nextPlacement: PortraitTransform, templateId = value?.templateId ?? "balloon") {
    updatePlacement(nextPlacement);
    if (!value?.stickerImageUrl) return;
    const stickerImageUrl = value.stickerImageUrl;
    lifecycle.schedule(() => {
      startCompose(stickerImageUrl, templateId, nextPlacement);
    }, 140);
  }

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const task = lifecycle.begin();
    setError("");
    try {
      const cutout = await removePortraitBackground(file, {
        signal: task.signal,
        onPhase: (nextPhase) => {
          if (lifecycle.isCurrent(task)) setPhase(nextPhase);
        },
      });
      const sticker = await createPortraitSticker(cutout.blob, {
        displayWidth: 300,
        pixelRatio: 2,
        signal: task.signal,
      });
      const stickerImageUrl = await blobToDataUrl(sticker.blob, task.signal);
      if (!lifecycle.isCurrent(task)) return;
      const templateId = value?.templateId ?? "balloon";
      const nextPlacement = defaultTransform(templateId);
      updatePlacement(nextPlacement);
      await compose(task, stickerImageUrl, templateId, nextPlacement);
    } catch (caught) {
      if (isAbortError(caught) || !lifecycle.isCurrent(task)) return;
      setError(caught instanceof Error ? caught.message : "抠图没有完成，请重试或换一张照片。");
    } finally {
      if (lifecycle.settle(task)) setPhase(null);
    }
  }

  function chooseTemplate(templateId: PortraitTemplateId) {
    if (!value?.stickerImageUrl || templateId === value.templateId) return;
    const nextPlacement = defaultTransform(templateId);
    updatePlacement(nextPlacement);
    startCompose(value.stickerImageUrl, templateId, nextPlacement);
  }

  function resetPlacement() {
    const next = defaultTransform(value?.templateId ?? "balloon");
    scheduleCompose(next);
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!value || phase) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      start: placementRef.current,
      width: bounds.width,
      height: bounds.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const next = clampPlacement({
      ...active.start,
      centerX: active.start.centerX + (event.clientX - active.startX) / active.width,
      centerY: active.start.centerY + (event.clientY - active.startY) / active.height,
    });
    scheduleCompose(next);
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (value?.stickerImageUrl) startCompose(value.stickerImageUrl, value.templateId, placementRef.current);
  }

  return (
    <section className={styles.editor} aria-label="生日主角照片">
      {value ? (
        <div className={styles.heading}>
          <strong>调整主角海报</strong>
          <button type="button" className={styles.remove} onClick={() => {
            cancelCurrentTask();
            setPreviewUrl("");
            updatePlacement(defaultTransform("balloon"));
            setError("");
            onChange(undefined);
          }}>移除</button>
        </div>
      ) : null}

      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={selectPhoto}
      />

      {!value ? (
        <>
          <button type="button" className={styles.addPhoto} onClick={() => inputRef.current?.click()} disabled={Boolean(phase)}>
            <span>上传主角照片</span>
            <small>建议使用单人正面或半身照</small>
          </button>
          <p className={styles.localPrivacy}>原照只在本机处理，发布时只保存生成后的海报。</p>
        </>
      ) : (
        <>
          <div
            className={styles.preview}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={() => { drag.current = null; }}
            aria-label="主角海报预览，可在画面上拖动人物"
          >
            {previewUrl ? <img src={previewUrl} alt={`${recipientName || "TA"} 的生日主角海报预览`} /> : null}
            {phase ? <span className={styles.previewBusy}>{phaseLabel(phase)}</span> : null}
          </div>

          <fieldset className={styles.templates}>
            <legend>选择模板</legend>
            <div>
              {TEMPLATE_OPTIONS.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={value.templateId === template.id}
                  className={value.templateId === template.id ? styles.templateSelected : ""}
                  onClick={() => chooseTemplate(template.id)}
                  disabled={Boolean(phase)}
                >
                  <span className={styles.templateImage}><img src={template.thumbnail} alt="" /></span>
                  <span><strong>{template.name}</strong><small>{template.description}</small></span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className={styles.adjustments}>
            <label>
              <span>人物大小</span>
              <input
                type="range"
                min="0.38"
                max="0.76"
                step="0.01"
                value={placement.width}
                onChange={(event) => scheduleCompose(clampPlacement({ ...placement, width: Number(event.target.value) }))}
                disabled={Boolean(phase)}
              />
            </label>
            <p>按住预览里的人物拖动位置；贴纸和按钮会保持固定。</p>
            <div className={styles.adjustmentActions}>
              <button type="button" onClick={resetPlacement} disabled={Boolean(phase)}>重置位置</button>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={Boolean(phase)}>换一张照片</button>
            </div>
          </div>
        </>
      )}

      {phase && !value ? (
        <div className={styles.processing} role="status">
          <span>{phaseLabel(phase)}</span>
          <button type="button" onClick={cancelCurrentTask}>取消</button>
        </div>
      ) : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
