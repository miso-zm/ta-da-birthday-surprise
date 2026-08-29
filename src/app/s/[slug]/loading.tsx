export default function SurpriseLoading() {
  return (
    <main className="mx-auto grid min-h-[100dvh] w-full max-w-[430px] place-items-center px-5">
      <div className="paper-surface px-8 py-7 text-center" role="status">
        <span aria-hidden="true" className="mx-auto mb-3 block size-3 rounded-full bg-[var(--coral)]" />
        <p className="text-sm font-bold text-[var(--coral-dark)]">Tada 正在把惊喜送来…</p>
      </div>
    </main>
  );
}
