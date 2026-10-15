import { createAuditEvent } from "./audit-events.mjs";

const EVENT_TABLE = "audit_events";

function configFromEnv(env = process.env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const error = new Error("Durable audit storage is not configured");
    error.code = "AUDIT_STORAGE_NOT_CONFIGURED";
    throw error;
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("SUPABASE_URL must use HTTPS");
  }
  return { baseUrl: parsed.origin, key };
}

export async function appendAuditEvent(input, options = {}) {
  const event = createAuditEvent(input, options.now ?? new Date());
  const { baseUrl, key } = configFromEnv(options.env ?? process.env);
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${baseUrl}/rest/v1/${EVENT_TABLE}?on_conflict=actor,idempotency_key`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "resolution=ignore-duplicates,return=representation"
    },
    body: JSON.stringify({
      id: event.id,
      event_type: event.type,
      actor: event.actor,
      idempotency_key: event.idempotencyKey,
      occurred_at: event.occurredAt,
      chain: event.chain,
      entity_id: event.entityId,
      metadata: event.metadata
    }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) {
    const error = new Error(`Audit storage returned HTTP ${response.status}`);
    error.code = "AUDIT_STORAGE_ERROR";
    throw error;
  }
  const rows = await response.json();
  return Object.freeze({
    event,
    persisted: Array.isArray(rows) && rows.length > 0,
    duplicate: Array.isArray(rows) && rows.length === 0
  });
}

export function isAuditStorageConfigured(env = process.env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
