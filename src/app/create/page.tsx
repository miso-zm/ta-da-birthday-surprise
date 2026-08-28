import { SENDER_STEPS } from "../../lib/surprise-contract";

export default function CreateSurprisePage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 py-8">
      <section className="my-auto rounded-[28px] border-2 border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_6px_0_var(--line)]">
        <p className="text-sm font-black text-[var(--coral-deep)]">Ta-da!</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
          创建生日惊喜
        </h1>
        <p className="mt-4 leading-7 text-[var(--muted)]">
          六步创建模块的公共接口已经准备好，接下来会在这里接入 Sender 页面。
        </p>
        <p className="mt-5 text-sm font-bold text-[var(--muted)]">
          共 {SENDER_STEPS.length} 步 · 本地草稿 · Receiver Preview
        </p>
      </section>
    </main>
  );
}
