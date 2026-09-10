export default function SurpriseNotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] items-center px-5 py-8">
      <section className="paper-surface paper-fold w-full p-6 text-center">
        <p className="text-sm font-bold text-[var(--coral-dark)]">暂时没能找到这份惊喜</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">可能是链接不太对</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">请再打开一次收到的链接，或者稍后再试试。</p>
        <p className="mt-5 text-sm font-bold text-[var(--ink)]">请检查收到的链接是否完整。</p>
      </section>
    </main>
  );
}
