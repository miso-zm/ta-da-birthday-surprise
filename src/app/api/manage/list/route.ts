import { NextResponse } from "next/server";
import { MANAGER_COOKIE_NAME, persistence } from "@/lib/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };

export async function POST(request: Request) {
  try {
    const { config, service } = persistence();
    if (request.headers.get("origin") !== config.appOrigin) return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return NextResponse.json({ error: "bad-request" }, { status: 400, headers });
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "bad-request" }, { status: 400, headers });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16 * 1024) {
        await reader.cancel();
        return NextResponse.json({ error: "too-large" }, { status: 413, headers });
      }
      chunks.push(chunk.value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return NextResponse.json({ error: "bad-request" }, { status: 400, headers }); }
    const ids = body && typeof body === "object" && "ids" in body ? body.ids : null;
    if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== "string" || !/^[a-f0-9]{32}$/.test(id))) return NextResponse.json({ error: "bad-request" }, { status: 400, headers });
    const token = request.headers.get("cookie")?.split(";").map((part) => part.trim().split("=")).find(([name]) => name === MANAGER_COOKIE_NAME)?.[1];
    const works = await Promise.all([...new Set(ids)].map((id) => service.getManaged(id, token)));
    return NextResponse.json({ works: works.filter((work) => work !== null) }, { headers });
  } catch {
    return NextResponse.json({ error: "unavailable", message: "暂时无法读取作品，请稍后重试。" }, { status: 503, headers });
  }
}
