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
  const [resumeDraft, setResumeDraft] = useState<SenderDraft | undefined>();
  const latestDraft = useRef<SenderDraft | null>(null);
  const publishOperation = useRef<{ updatedAt: string; key: string } | null>(null);

  if (published) {
    return (
      <PublishedResult
        result={published}
        onEdit={() => {
          setResumeDraft(latestDraft.current ?? undefined);
          setPublished(null);
        }}
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
        if (!publishOperation.current || publishOperation.current.updatedAt !== draft.updatedAt) {
          publishOperation.current = { updatedAt: draft.updatedAt, key: createPublishOperationKey() };
        }
        const response = await fetch("/api/publish", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": publishOperation.current.key,
          },
          body: JSON.stringify({ content: nextPreview }),
        });
        if (!response.ok) {
          if (response.status === 409) publishOperation.current = null;
          throw new Error(
            response.status === 503
              ? "发布服务暂时不可用，草稿已保留，请稍后重试。"
              : "内容或礼物链接没有通过安全检查，请检查后重试。",
          );
        }
        const result = await response.json() as PublishedSurpriseLinks;
        setPublished(result);
      }}
    />
  );
}
