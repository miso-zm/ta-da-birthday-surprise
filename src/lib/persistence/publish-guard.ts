import { PersistenceError } from "./errors";

type Bucket = { minute: number; minuteCount: number; day: string; dayCount: number; lastSeen: number };
const buckets = new Map<string, Bucket>();
let active = false;
type Waiter = {
  resolve: (release: () => void) => void;
  reject: (error: PersistenceError) => void;
  timer: ReturnType<typeof setTimeout>;
  signal?: AbortSignal;
  onAbort?: () => void;
};
const queue: Waiter[] = [];
const BUCKET_RETENTION_MS = 2 * 24 * 60 * 60 * 1_000;

function clientKey(request: Request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return realIp || forwarded || "local-or-unknown";
}

export function assertPublishRate(request: Request, now = new Date()) {
  const key = clientKey(request);
  const nowMs = now.getTime();
  for (const [storedKey, bucket] of buckets) {
    if (nowMs - bucket.lastSeen > BUCKET_RETENTION_MS) buckets.delete(storedKey);
  }
  const minute = Math.floor(now.getTime() / 60_000);
  const day = now.toISOString().slice(0, 10);
  const previous = buckets.get(key);
  const bucket: Bucket = previous ?? { minute, minuteCount: 0, day, dayCount: 0, lastSeen: nowMs };
  if (bucket.minute !== minute) { bucket.minute = minute; bucket.minuteCount = 0; }
  if (bucket.day !== day) { bucket.day = day; bucket.dayCount = 0; }
  bucket.lastSeen = nowMs;
  if (bucket.dayCount >= 20) {
    throw new PersistenceError("daily-rate-limited", "今日发布次数已达上限，请明天再试。");
  }
  if (bucket.minuteCount >= 6) {
    throw new PersistenceError("rate-limited", "发布次数较多，请稍后再试。");
  }
  bucket.minuteCount += 1;
  bucket.dayCount += 1;
  buckets.set(key, bucket);
}

function cleanupWaiter(waiter: Waiter) {
  clearTimeout(waiter.timer);
  if (waiter.signal && waiter.onAbort) waiter.signal.removeEventListener("abort", waiter.onAbort);
}

function createRelease(): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = queue.shift();
    if (!next) {
      active = false;
      return;
    }
    cleanupWaiter(next);
    next.resolve(createRelease());
  };
}

export function acquirePublishSlot(options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<() => void> {
  if (options.signal?.aborted) {
    return Promise.reject(new PersistenceError("unavailable", "发布请求已取消。"));
  }
  if (!active) {
    active = true;
    return Promise.resolve(createRelease());
  }
  if (queue.length >= 1) {
    return Promise.reject(new PersistenceError("rate-limited", "发布服务正忙，请稍后再试。"));
  }
  const timeoutMs = Math.max(1, Math.min(options.timeoutMs ?? 15_000, 60_000));
  return new Promise<() => void>((resolve, reject) => {
    const waiter = {} as Waiter;
    waiter.resolve = resolve;
    waiter.reject = reject;
    waiter.signal = options.signal;
    const removeAndReject = (error: PersistenceError) => {
      const index = queue.indexOf(waiter);
      if (index >= 0) queue.splice(index, 1);
      cleanupWaiter(waiter);
      reject(error);
    };
    waiter.timer = setTimeout(() => removeAndReject(
      new PersistenceError("rate-limited", "发布服务等待超时，请稍后再试。"),
    ), timeoutMs);
    waiter.onAbort = () => removeAndReject(new PersistenceError("unavailable", "发布请求已取消。"));
    options.signal?.addEventListener("abort", waiter.onAbort, { once: true });
    queue.push(waiter);
  });
}

export function resetPublishGuardForTests() {
  buckets.clear();
  active = false;
  queue.splice(0).forEach((waiter) => {
    cleanupWaiter(waiter);
    waiter.reject(new PersistenceError("unavailable", "Publish guard reset."));
  });
}

export function getPublishGuardBucketCountForTests() {
  return buckets.size;
}
