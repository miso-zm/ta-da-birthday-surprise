import { NextResponse } from "next/server";
import { MANAGER_COOKIE_NAME, PersistenceError, persistence } from "@/lib/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 52 * 1024 * 1024;

async function readBoundedBody(request: Request): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new PersistenceError("bad-request", "照片总大小过大，请压缩后重试。");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total).toString("utf8");
}

function errorResponse(error: unknown) {
  if (error instanceof PersistenceError) {
    const status = error.code === "forbidden" ? 403 : error.code === "conflict" ? 409 : 400;
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
    );
  }
  return NextResponse.json(
    { error: "unavailable", message: "发布服务暂时不可用，请稍后重试。" },
    { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}

export async function POST(request: Request) {
  try {
    const { config, service } = persistence();
    if (request.headers.get("origin") !== config.appOrigin) {
      throw new PersistenceError("forbidden", "发布请求来源不正确。");
    }
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new PersistenceError("bad-request", "发布内容必须使用 JSON 格式。");
    }
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_REQUEST_BYTES) {
      throw new PersistenceError("bad-request", "照片总大小过大，请压缩后重试。");
    }
    const raw = await readBoundedBody(request);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new PersistenceError("bad-request", "发布内容格式不正确。");
    }
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const idempotencyKey = request.headers.get("idempotency-key") ?? "";
    const managerToken = request.headers.get("cookie")
      ?.split(";")
      .map((part) => part.trim().split("="))
      .find(([name]) => name === MANAGER_COOKIE_NAME)?.[1];
    const result = await service.publish(input.content, idempotencyKey, managerToken);
    const response = NextResponse.json(
      {
        publicationId: result.publicationId,
        shareUrl: result.shareUrl,
        manageUrl: result.manageUrl,
        expiresAt: result.expiresAt,
      },
      { status: 201, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
    );
    response.cookies.set(MANAGER_COOKIE_NAME, result.managerToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.appOrigin.startsWith("https://"),
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
