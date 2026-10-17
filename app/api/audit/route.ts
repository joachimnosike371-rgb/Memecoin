import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { appendAuditEvent } from "../../..//lib/audit-store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = process.env.AUDIT_WRITE_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  }
  try {
    const result = await appendAuditEvent(body as Parameters<typeof appendAuditEvent>[0]);
    return NextResponse.json({ ok: true, persisted: result.persisted, duplicate: result.duplicate });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (error instanceof TypeError) return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
    if (code === "AUDIT_STORAGE_NOT_CONFIGURED") return NextResponse.json({ ok: false, error: "audit_storage_not_configured" }, { status: 503 });
    return NextResponse.json({ ok: false, error: "audit_storage_failed" }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: { Allow: "POST" } });
}
