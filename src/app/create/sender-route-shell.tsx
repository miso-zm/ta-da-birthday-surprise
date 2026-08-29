"use client";

import { useRef, useState } from "react";
import { SenderBuilder } from "@/features/sender";
import type { SenderDraft, SurprisePreview } from "@/lib/surprise-contract";
import { ReceiverShell } from "../s/[slug]/receiver-shell";

export function SenderRouteShell() {
  const [preview, setPreview] = useState<SurprisePreview | null>(null);
  const [resumeDraft, setResumeDraft] = useState<SenderDraft | undefined>();
  const latestDraft = useRef<SenderDraft | null>(null);

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
    />
  );
}
