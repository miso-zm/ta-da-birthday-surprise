import { PersistenceError } from "./errors";

type Bucket = { minute: number; minuteCount: number; day: string; dayCount: number };
const buckets = new Map<string, Bucket>();
let active = false;
const queue: Array<() => void> = [];

function clientKey(request: Request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return realIp || forwarded || "local-or-unknown";
}

export function assertPublishRate(request: Request, now = new Date()) {
  const key = clientKey(request);
  const minute = Math.floor(now.getTime() / 60_000);
  const day = now.toISOString().slice(0, 10);
  const previous = buckets.get(key);
  const bucket: Bucket = previous ?? { minute, minuteCount: 0, day, dayCount: 0 };
  if (bucket.minute !== minute) { bucket.minute = minute; bucket.minuteCount = 0; }
  if (bucket.day !== day) { bucket.day = day; bucket.dayCount = 0; }
  if (bucket.minuteCount >= 6 || bucket.dayCount >= 20) {
    throw new PersistenceError("rate-limited", "发布次数较多，请稍后再试。");
  }
  bucket.minuteCount += 1;
  bucket.dayCount += 1;
  buckets.set(key, bucket);
}

export async function acquirePublishSlot(): Promise<() => void> {
  if (!active) {
    active = true;
  } else {
    if (queue.length >= 1) throw new PersistenceError("rate-limited", "发布服务正忙，请稍后再试。");
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = queue.shift();
    if (next) next(); else active = false;
  };
}

export function resetPublishGuardForTests() {
  buckets.clear();
  active = false;
  queue.splice(0).forEach((resolve) => resolve());
}
