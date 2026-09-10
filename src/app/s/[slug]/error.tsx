"use client";

export default function SurpriseError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] items-center px-5 py-8">
      <section className="paper-surface paper-fold w-full p-6 text-center">
        <p className="text-sm font-bold text-[var(--coral-dark)]">惊喜暂时没有送到</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">稍后再试一次吧</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">内容还好好地保存着，只是现在暂时无法读取。</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-12 w-full rounded-[var(--radius-round)] bg-[var(--coral-action)] px-5 font-bold text-[var(--on-dark)]"
        >
          重新加载
        </button>
      </section>
    </main>
  );
}
