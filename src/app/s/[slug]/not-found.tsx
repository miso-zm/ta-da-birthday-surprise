import Link from "next/link";

export default function SurpriseNotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] items-center px-5 py-8">
      <section className="w-full rounded-[28px] border-2 border-[var(--line)] bg-[var(--paper)] p-6 text-center shadow-[0_6px_0_var(--line)]">
        <p className="text-sm font-bold text-[var(--coral-dark)]">这份惊喜暂时没有找到</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">可能是链接写错了</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">请重新打开收到的分享链接，或者稍后再试一次。</p>
        <Link href="/s/mia-birthday" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-[18px] border-2 border-[var(--line)] bg-[var(--coral)] px-5 font-extrabold text-white shadow-[0_4px_0_var(--line)] active:translate-y-1 active:shadow-none">
          打开演示惊喜
        </Link>
      </section>
    </main>
  );
}
