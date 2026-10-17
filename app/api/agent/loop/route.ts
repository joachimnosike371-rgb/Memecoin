import { NextResponse } from "next/server";
import { fetchRankedXNarratives } from "../../../../lib/x-narratives.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Authenticated scheduler heartbeat. Deliberately performs discovery only:
 * no wallet signing, deployment, swaps, fee transfers, or rotation transactions.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    || "";
  if (!expected || !supplied || supplied.length !== expected.length) {
    return NextResponse.json({ ok: false, error: "Unauthorized scheduler request." }, { status: 401 });
  }
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  if (mismatch !== 0) return NextResponse.json({ ok: false, error: "Unauthorized scheduler request." }, { status: 401 });

  try {
    const result = await fetchRankedXNarratives();
    return NextResponse.json({
      ok: true,
      mode: "discovery-only",
      cycleAt: new Date().toISOString(),
      rankedNarratives: result.narratives,
      tweetCount: result.tweetCount,
      provider: result.provider,
      execution: { enabled: false, reason: "Mainnet trading, token deployment, fee collection, and rotation are not implemented or enabled." }
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    return NextResponse.json({
      ok: false,
      mode: "discovery-only",
      error: code === "PROVIDER_NOT_CONFIGURED" ? "X_BEARER_TOKEN is not configured." : "Narrative discovery failed.",
      execution: { enabled: false }
    }, { status: code === "PROVIDER_NOT_CONFIGURED" ? 503 : 502 });
  }
}
