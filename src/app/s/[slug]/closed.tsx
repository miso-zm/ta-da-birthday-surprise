export function SurpriseClosed() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] items-center px-5 py-8">
      <section className="paper-surface paper-fold w-full p-6 text-center">
        <p className="text-sm font-bold text-[var(--coral-dark)]">Ta-da!</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">这份惊喜已经收起来了</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
          它可能已经到期，或者送礼人选择了撤回。
        </p>
      </section>
    </main>
  );
}
