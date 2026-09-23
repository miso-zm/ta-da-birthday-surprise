"use client";

import { useRef, useState } from "react";
import { SenderBuilder } from "@/features/sender";
import type {
  PublishedSurpriseLinks,
  SenderDraft,
  SurprisePreview,
} from "@/lib/surprise-contract";
import { ReceiverShell } from "../s/[slug]/receiver-shell";
import { PublishedResult } from "./published-result";
import { getBrowserDraftStorage } from "@/lib/sender-draft-storage";
import { rememberPublishedWork } from "@/lib/published-work-storage";
import {
  PublishResultUnknownError,
  createPublishOperationCoordinator,
  getBrowserPublishOperationStorage,
  runWithPublishTimeout,
} from "@/lib/publish-operation";

function createPublishOperationKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function SenderRouteShell() {
  const [preview, setPreview] = useState<SurprisePreview | null>(null);
  const [published, setPublished] = useState<PublishedSurpriseLinks | null>(null);
  const [historySaved, setHistorySaved] = useState(true);
  const [resumeDraft, setResumeDraft] = useState<SenderDraft | undefined>();
  const latestDraft = useRef<SenderDraft | null>(null);
  const publishCoordinator = useRef<ReturnType<typeof createPublishOperationCoordinator> | null>(null);

  if (published) {
    return (
      <PublishedResult
        result={published}
        historySaved={historySaved}
      />
    );
  }

  if (preview) {
    return (
      <ReceiverShell
        surprise={preview}
        onExitPreview={() => {
          setResumeDraft(latestDraft.current ?? undefined);
          setPreview(null);
        }}
      />
    );
  }

  return (
    <SenderBuilder
      initialDraft={resumeDraft}
      onDraftChange={(draft) => {
        latestDraft.current = draft;
      }}
      onPreview={(nextPreview, draft) => {
        latestDraft.current = draft;
        setPreview(nextPreview);
      }}
      onPublish={async (nextPreview, draft) => {
        latestDraft.current = draft;
        if (!publishCoordinator.current) {
          publishCoordinator.current = createPublishOperationCoordinator(
            getBrowserPublishOperationStorage(),
            createPublishOperationKey,
          );
        }
        const signature = `${draft.draftId}:${draft.updatedAt}`;
        const result = await publishCoordinator.current.publish(signature, (idempotencyKey) =>
          runWithPublishTimeout(async (signal) => {
            let response: Response;
            try {
              response = await fetch("/api/publish", {
                method: "POST",
                credentials: "same-origin",
                signal,
                headers: {
                  "Content-Type": "application/json",
                  "Idempotency-Key": idempotencyKey,
                },
                body: JSON.stringify({
                  content: nextPreview,
                  consent: { termsAccepted: true },
                }),
              });
            } catch {
              throw new PublishResultUnknownError();
            }
            if (!response.ok) {
              const details = await response.json().catch(() => null) as { error?: string } | null;
              throw new Error(
                details?.error === "daily-rate-limited"
                  ? "今日发布次数已达上限，请明天再试。"
                  : response.status >= 500
                    ? "发布服务暂时不可用，请稍后重试。"
                    : response.status === 413
                      ? "照片总大小过大，请压缩照片后重试。"
                    : response.status === 429
                      ? "发布次数较多，请稍等片刻再试。"
                    : response.status === 403
                      ? "发布请求未通过验证，请刷新页面后重试。"
                    : response.status === 409
                      ? "这次发布与已有操作冲突，请修改内容后再发布。"
                    : response.status === 507
                      ? "发布存储空间不足，请稍后重试。"
                      : "内容或礼物链接没有通过安全检查，请检查后重试。",
              );
            }
            return response.json() as Promise<PublishedSurpriseLinks>;
          }),
        );
        const storage = getBrowserDraftStorage();
        setHistorySaved(Boolean(storage && rememberPublishedWork(storage, {
          ...result, recipientName: draft.basics.recipientName, memoryKind: draft.memoryKind,
        }, window.location.origin)));
        setPublished(result);
      }}
    />
  );
}
