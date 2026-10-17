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
 * Protected scheduled heartbeat. Vercel Cron uses GET; manual callers may use POST.
 * This records an idempotent trigger only. It does not trade or deploy tokens.
 */
async function handleTrigger(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const suppliedKey = request.headers.get("x-idempotency-key");
  const idempotencyKey = suppliedKey ?? `cron-trigger:${new Date().toISOString().slice(0, 10)}`;
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return NextResponse.json({ ok: false, error: "Invalid x-idempotency-key" }, { status: 400 });
  }

  try {
    const result = await appendAuditEvent({
      type: "scheduler.started",
      actor: "scheduler",
      idempotencyKey,
      metadata: { action: "heartbeat-recorded", executionEnabled: false }
    });
    return NextResponse.json({ ok: true, ...result, executionEnabled: false }, { status: result.duplicate ? 200 : 202 });
  } catch {
    return NextResponse.json({ ok: false, error: "Scheduler audit persistence unavailable" }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  return handleTrigger(request);
}

export async function POST(request: NextRequest) {
  return handleTrigger(request);
}
