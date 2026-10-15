import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "zero-capital-farm",
    mode: "simulation",
    liveExecutionEnabled: false,
    timestamp: new Date().toISOString()
  });
}
