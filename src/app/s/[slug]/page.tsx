import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDemoSurprise } from "@/content/demo-surprise";
import { persistence } from "@/lib/persistence";
import { SurpriseClosed } from "./closed";
import { ReceiverShell } from "./receiver-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ta-da! 生日惊喜",
  description: "一份需要亲手打开的互动生日惊喜。",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function SurprisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demo = getDemoSurprise(slug);

  if (demo) return <ReceiverShell surprise={demo} />;

  const result = await persistence().service.load(slug);
  if (result.status === "closed") return <SurpriseClosed />;
  if (result.status === "not-found") notFound();

  return <ReceiverShell surprise={result.surprise} />;
}
