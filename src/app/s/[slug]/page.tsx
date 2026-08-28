import { notFound } from "next/navigation";
import { getDemoSurprise } from "@/content/demo-surprise";
import { ReceiverShell } from "./receiver-shell";

export default async function SurprisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const surprise = getDemoSurprise(slug);

  if (!surprise) {
    notFound();
  }

  return <ReceiverShell surprise={surprise} />;
}
