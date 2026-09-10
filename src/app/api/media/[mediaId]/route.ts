import { NextResponse } from "next/server";
import { PersistenceError, persistence } from "@/lib/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    const { mediaId } = await params;
    const url = new URL(request.url);
    const result = await persistence().service.media(
      mediaId,
      url.searchParams.get("expires") ?? "",
      url.searchParams.get("signature") ?? "",
    );
    return new NextResponse(new Uint8Array(result.bytes), {
      headers: {
        "Content-Type": result.mimeType,
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": "inline",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    const status = error instanceof PersistenceError && error.code === "forbidden" ? 403 : 404;
    return new NextResponse(null, {
      status,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
}
