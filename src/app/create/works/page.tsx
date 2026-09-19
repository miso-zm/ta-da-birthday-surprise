import type { Metadata } from "next";
import { WorksCollection } from "./works-collection";

export const metadata: Metadata = { title: "我的作品 | Ta-da!", robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" };
export default function WorksPage() { return <WorksCollection />; }
