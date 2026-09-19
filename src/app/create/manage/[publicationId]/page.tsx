import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MANAGER_COOKIE_NAME, persistence } from "@/lib/persistence";
import { ManageControls } from "./manage-controls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "管理生日惊喜 | Ta-da!",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function ManagePublicationPage({
  params,
}: {
  params: Promise<{ publicationId: string }>;
}) {
  const { publicationId } = await params;
  const managerToken = (await cookies()).get(MANAGER_COOKIE_NAME)?.value;
  const publication = await persistence().service.getManaged(publicationId, managerToken);

  if (!publication) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] items-center px-5 py-8">
        <section className="paper-surface paper-fold w-full p-6 text-center">
          <h1 className="text-3xl font-bold tracking-[-0.04em]">无法管理这份惊喜</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
            请使用当初发布它的浏览器打开管理入口。清除浏览器数据后，暂时无法找回管理权。
          </p>
        </section>
      </main>
    );
  }

  const inactive = publication.status !== "active";
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] items-center px-5 py-8">
      <section className="paper-surface paper-fold w-full p-6">
        <p className="text-sm font-bold text-[var(--coral-dark)]">Ta-da! 管理入口</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">管理这份惊喜</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
          {inactive ? "这份惊喜已经收起来了。" : `有效期至 ${new Date(publication.expiresAt).toLocaleDateString("zh-CN")}。`}
        </p>
        {!inactive ? <ManageControls publicationId={publication.id} /> : null}
        <a href="/create" className="mt-3 flex min-h-11 items-center justify-center text-sm font-bold text-[var(--ink)] underline underline-offset-4">
          继续修改草稿
        </a>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          修改后发布会生成新链接，这份已发送的心意不会改变。
        </p>
        <a href="/create/works" className="mt-3 flex min-h-11 items-center justify-center text-sm font-semibold text-[var(--ink)]">返回我的作品</a>
      </section>
    </main>
  );
}
