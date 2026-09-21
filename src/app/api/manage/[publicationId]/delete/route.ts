import { NextRequest, NextResponse } from "next/server";
import { MANAGER_COOKIE_NAME, PersistenceError, persistence } from "@/lib/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicationId: string }> },
) {
  try {
    const { publicationId } = await params;
    const { config, service } = persistence();
    if (request.headers.get("origin") !== config.appOrigin) {
      throw new PersistenceError("forbidden", "Request origin is not allowed.");
    }
    const managerToken = request.cookies.get(MANAGER_COOKIE_NAME)?.value;
    const result = await service.deletePublication(publicationId, managerToken);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  } catch (error) {
    const status = error instanceof PersistenceError
      ? error.code === "forbidden" ? 403 : error.code === "not-found" ? 404 : 400
      : 503;
    return NextResponse.json(
      { error: status === 503 ? "unavailable" : "request-failed", message: status === 503 ? "删除服务暂时不可用。" : "无法永久删除这份惊喜。" },
      { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
    );
  }
}
