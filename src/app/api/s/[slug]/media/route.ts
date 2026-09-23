import { NextResponse } from "next/server";
import { PersistenceError, persistence } from "@/lib/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { config, service } = persistence();
    if (request.headers.get("origin") !== config.appOrigin) {
      throw new PersistenceError("forbidden", "Media refresh origin is invalid.");
    }
    const { slug } = await params;
    const result = await service.refreshMedia(slug);
    if (result.status !== "active") {
      return NextResponse.json(
        { error: result.status },
        { status: result.status === "closed" ? 410 : 404, headers: responseHeaders },
      );
    }
    return NextResponse.json(
      { surprise: result.surprise },
      { status: 200, headers: responseHeaders },
    );
  } catch (error) {
    const status = error instanceof PersistenceError && error.code === "forbidden" ? 403 : 404;
    return NextResponse.json(
      { error: status === 403 ? "forbidden" : "not-found" },
      { status, headers: responseHeaders },
    );
  }
}
