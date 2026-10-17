import { randomUUID } from "node:crypto";

const EVENT_TYPES = new Set([
  "draft.saved", "market.snapshot", "wallet.approval.requested",
  "wallet.approval.granted", "wallet.approval.denied", "transaction.submitted",
  "transaction.confirmed", "transaction.failed", "scheduler.started",
  "scheduler.skipped", "scheduler.failed", "fee.validation"
]);

export function createAuditEvent(input, now = new Date()) {
  if (!input || typeof input !== "object") throw new TypeError("Event input is required");
  if (!EVENT_TYPES.has(input.type)) throw new TypeError("Unsupported audit event type");
  if (typeof input.actor !== "string" || input.actor.trim().length < 1 || input.actor.length > 128) {
    throw new TypeError("actor must be 1-128 characters");
  }
  if (typeof input.idempotencyKey !== "string" || input.idempotencyKey.trim().length < 8 || input.idempotencyKey.length > 200) {
    throw new TypeError("idempotencyKey must be 8-200 characters");
  }
  if (input.metadata !== undefined && (input.metadata === null || Array.isArray(input.metadata) || typeof input.metadata !== "object")) {
    throw new TypeError("metadata must be an object");
  }
  return Object.freeze({
    id: randomUUID(),
    type: input.type,
    actor: input.actor.trim(),
    idempotencyKey: input.idempotencyKey,
    occurredAt: now.toISOString(),
    chain: input.chain ?? null,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {}
  });
}

export const auditEventTypes = Object.freeze([...EVENT_TYPES]);
