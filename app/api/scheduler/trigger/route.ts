import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

/**
 * Protected scheduler ingress. This deliberately records an idempotent trigger only;
 * no trade, token deployment, or wallet operation is executed by this endpoint.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const idempotencyKey = request.headers.get("x-idempotency-key");
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return NextResponse.json({ ok: false, error: "Valid x-idempotency-key required" }, { status: 400 });
  }

  try {
    const result = await appendAuditEvent({
      type: "scheduler.started",
      actor: "scheduler",
      idempotencyKey,
      metadata: { action: "trigger-recorded", executionEnabled: false }
    });
    return NextResponse.json({ ok: true, ...result, executionEnabled: false }, { status: result.duplicate ? 200 : 202 });
  } catch {
    return NextResponse.json({ ok: false, error: "Scheduler audit persistence unavailable" }, { status: 503 });
  }
}
