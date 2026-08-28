export default function SurpriseLoading() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 py-6" aria-label="正在加载生日惊喜">
      <div className="h-10 w-40 rounded-[14px] bg-[#eadfce]" />
      <div className="my-auto space-y-4 rounded-[28px] border-2 border-[var(--line)] bg-[var(--paper)] p-6">
        <div className="h-7 w-3/4 rounded-[12px] bg-[#eadfce]" />
        <div className="h-4 w-full rounded-[10px] bg-[#efe6d9]" />
        <div className="h-4 w-4/5 rounded-[10px] bg-[#efe6d9]" />
        <div className="mt-8 h-14 w-full rounded-[18px] bg-[#eadfce]" />
      </div>
    </main>
  );
}
