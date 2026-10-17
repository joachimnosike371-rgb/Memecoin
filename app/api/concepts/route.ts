import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractText(payload: any): string {
  const choice = payload?.choices?.[0]?.message?.content;
  if (typeof choice === "string") return choice;
  if (Array.isArray(choice)) return choice.map((part: any) => part?.text ?? "").join("\n");
  return "";
}

export async function POST(request: Request) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Grok is not connected. Configure XAI_API_KEY on the server." }, { status: 503 });
  }
  let body: { narrative?: unknown; examples?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON." }, { status: 400 });
  }
  const narrative = typeof body.narrative === "string" ? body.narrative.trim() : "";
  if (!narrative || narrative.length > 1200) {
    return NextResponse.json({ ok: false, error: "Provide a narrative between 1 and 1,200 characters." }, { status: 400 });
  }
  const examples = Array.isArray(body.examples)
    ? body.examples.filter((value): value is string => typeof value === "string").slice(0, 3).map((value) => value.slice(0, 240))
    : [];
  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-3-mini",
        temperature: 0.7,
        max_tokens: 700,
        messages: [
          { role: "system", content: "Generate creative, clearly labeled memecoin concept drafts from market narratives. Do not claim guaranteed returns, fabricate evidence, advise market manipulation, or suggest copying trademarks or impersonating people. Return strict JSON with an array named concepts; each item must contain name, ticker, thesis, risks, and confidence (0-100). These are ideas only, not investment advice or a launch instruction." },
          { role: "user", content: JSON.stringify({ narrative, examples }) }
        ]
      }),
      signal: AbortSignal.timeout(20_000)
    });
    if (!response.ok) {
      return NextResponse.json({ ok: false, error: `Grok API returned HTTP ${response.status}.` }, { status: 502 });
    }
    const payload = await response.json();
    const text = extractText(payload);
    let parsed: any;
    try {
      parsed = JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""));
    } catch {
      return NextResponse.json({ ok: false, error: "Grok returned a response that was not valid JSON." }, { status: 502 });
    }
    const concepts = Array.isArray(parsed?.concepts) ? parsed.concepts.slice(0, 5).map((item: any) => ({
      name: String(item?.name ?? "").slice(0, 40),
      ticker: String(item?.ticker ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 10),
      thesis: String(item?.thesis ?? "").slice(0, 500),
      risks: String(item?.risks ?? "").slice(0, 500),
      confidence: Math.max(0, Math.min(100, Number(item?.confidence) || 0))
    })).filter((item: any) => item.name && item.ticker && item.thesis) : [];
    return NextResponse.json({ ok: true, provider: "xAI Grok", model: process.env.XAI_MODEL || "grok-3-mini", generatedAt: new Date().toISOString(), concepts, executionEnabled: false });
  } catch {
    return NextResponse.json({ ok: false, error: "Grok request failed or timed out." }, { status: 502 });
  }
}
