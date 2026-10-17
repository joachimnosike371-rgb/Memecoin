import { NextResponse } from "next/server";
import { fetchRankedXNarratives } from "../../../lib/x-narratives.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    if (query && (query.length > 180 || /[\r\n]/.test(query))) {
      return NextResponse.json({ ok: false, error: "Search query is invalid or too long." }, { status: 400 });
    }
    const result = await fetchRankedXNarratives({ query: query || undefined });
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const status = code === "PROVIDER_NOT_CONFIGURED" ? 503 : 502;
    return NextResponse.json({
      ok: false,
      error: code === "PROVIDER_NOT_CONFIGURED"
        ? "X narrative search is not connected. Configure X_BEARER_TOKEN on the server."
        : "X narrative search failed. Check provider access and quota."
    }, { status });
  }
}
