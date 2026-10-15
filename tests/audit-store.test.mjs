import test from "node:test";
import assert from "node:assert/strict";
import { appendAuditEvent, isAuditStorageConfigured } from "../lib/audit-store.mjs";

const input = {
  type: "draft.saved",
  actor: "test-suite",
  idempotencyKey: "draft-event-0001",
  metadata: { source: "automated-test" }
};
const env = {
  SUPABASE_URL: "https://example-project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-only-secret"
};

test("audit storage fails closed without server credentials", async () => {
  assert.equal(isAuditStorageConfigured({}), false);
  await assert.rejects(appendAuditEvent(input, { env: {} }), (error) => error.code === "AUDIT_STORAGE_NOT_CONFIGURED");
});

test("audit event persists with a unique conflict target and never exposes credentials in the returned record", async () => {
  let seen;
  const result = await appendAuditEvent(input, {
    env,
    now: new Date("2026-01-01T00:00:00Z"),
    fetcher: async (url, options) => {
      seen = { url, options };
      return { ok: true, json: async () => [{ id: "server-id" }] };
    }
  });
  assert.equal(result.persisted, true);
  assert.equal(result.duplicate, false);
  assert.match(seen.url, /on_conflict=actor,idempotency_key/);
  assert.equal(seen.options.method, "POST");
  assert.match(seen.options.headers.authorization, /^Bearer test-only-secret$/);
  assert.equal(result.event.occurredAt, "2026-01-01T00:00:00.000Z");
  assert.equal(JSON.stringify(result).includes("test-only-secret"), false);
});

test("audit idempotency returns duplicate when the database ignored a conflict", async () => {
  const result = await appendAuditEvent(input, {
    env,
    fetcher: async () => ({ ok: true, json: async () => [] })
  });
  assert.equal(result.persisted, false);
  assert.equal(result.duplicate, true);
});

test("audit storage errors are surfaced without leaking provider response text", async () => {
  await assert.rejects(
    appendAuditEvent(input, {
      env,
      fetcher: async () => ({ ok: false, status: 500, text: async () => "sensitive database detail" })
    }),
    (error) => error.code === "AUDIT_STORAGE_ERROR" && !error.message.includes("sensitive")
  );
});
