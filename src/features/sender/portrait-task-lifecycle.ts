export type PortraitTask = Readonly<{
  id: number;
  signal: AbortSignal;
}>;

/** Owns cancellation and result eligibility for the complete portrait pipeline. */
export class PortraitTaskLifecycle {
  private version = 0;
  private active: { task: PortraitTask; controller: AbortController } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  get busy() {
    return this.active !== null;
  }

  begin(): PortraitTask {
    if (this.disposed) throw new Error("Portrait task lifecycle is disposed.");
    this.invalidatePending();
    const controller = new AbortController();
    const task = { id: ++this.version, signal: controller.signal };
    this.active = { task, controller };
    return task;
  }

  schedule(callback: () => void, delay: number) {
    if (this.disposed) return;
    this.invalidatePending();
    const scheduledVersion = ++this.version;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.disposed && scheduledVersion === this.version) callback();
    }, delay);
  }

  isCurrent(task: PortraitTask) {
    return !this.disposed
      && !task.signal.aborted
      && this.active?.task.id === task.id;
  }

  settle(task: PortraitTask) {
    if (!this.isCurrent(task)) return false;
    this.active = null;
    return true;
  }

  cancel() {
    this.invalidatePending();
    this.version += 1;
  }

  dispose() {
    if (this.disposed) return;
    this.cancel();
    this.disposed = true;
  }

  private invalidatePending() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.active?.controller.abort();
    this.active = null;
  }
}
