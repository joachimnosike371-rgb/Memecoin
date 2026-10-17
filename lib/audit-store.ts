export type AuditEventInput = {
  type: "draft.saved" | "market.snapshot" | "wallet.approval.requested" | "wallet.approval.granted" |
    "wallet.approval.denied" | "transaction.submitted" | "transaction.confirmed" | "transaction.failed" |
    "scheduler.started" | "scheduler.skipped" | "scheduler.failed" | "fee.validation";
  actor: string;
  idempotencyKey: string;
  chain?: "ethereum-sepolia" | "bnb-testnet" | "solana-devnet" | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export type AuditEventWriteResult = { stored: true; duplicate: boolean };

/**
 * Server-only Supabase REST writer. Never call from client components.
 * The unique (actor, idempotency_key) constraint makes retries safe.
 */
export async function appendAuditEvent(input: AuditEventInput): Promise<AuditEventWriteResult> {
  if (!input.actor.trim() || input.actor.length > 128) throw new TypeError("Invalid audit actor");
  if (input.idempotencyKey.trim().length < 8 || input.idempotencyKey.length > 200) {
    throw new TypeError("Invalid audit idempotency key");
  }
  if (input.metadata !== undefined && (input.metadata === null || Array.isArray(input.metadata))) {
    throw new TypeError("Audit metadata must be an object");
  }

  const baseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) throw new Error("Durable audit storage is not configured");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/audit_events?on_conflict=actor,idempotency_key`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "resolution=ignore-duplicates,return=representation"
    },
    body: JSON.stringify({
      event_type: input.type,
      actor: input.actor.trim(),
      idempotency_key: input.idempotencyKey,
      chain: input.chain ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {}
    }),
    cache: "no-store"
  });
  if (!response.ok) {
    // Avoid logging credentials or provider response bodies that may contain sensitive details.
    throw new Error(`Durable audit write failed (HTTP ${response.status})`);
  }
  const rows = await response.json() as unknown[];
  return { stored: true, duplicate: rows.length === 0 };
}
