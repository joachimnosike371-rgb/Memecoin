# Security review and release gates

## Current security boundary

- [x] Scheduler ingress requires a server-side bearer secret, compares secrets with constant-time equality after length validation, and rejects missing credentials.
- [x] Scheduler heartbeat uses an idempotency key; durable uniqueness is enforced by the database.
- [x] Audit events are append-only by application convention; table-level row-level security is enabled with no browser-facing policies.
- [x] Service-role credentials are read only on the server and must never be placed in client-prefixed environment variables.
- [x] Wallet approval requests are bound to an expected chain and account and do not contain private keys.
- [x] Execution remains disabled in the adapters and scheduler heartbeat.
- [x] CI runs unit tests, TypeScript type-checking, and a production build.

## Required before testnet end-to-end

- [ ] Apply the Supabase migration and verify service-role access in a non-production environment.
- [ ] Add wallet-provider integration; verify signed transactions and receipts from the configured testnet RPC, not merely a client-supplied transaction reference.
- [ ] Select the actual token launch venue and inspect its fee hooks, router path, contract permissions, exemptions, and fee-on-transfer compatibility.
- [ ] Test duplicate scheduler deliveries, invalid secrets, database outages, provider timeouts, and rate-limit responses.
- [ ] Add provider-specific quotas and a shared rate limiter for multi-instance deployment.
- [ ] Add alerting for repeated scheduler failures, RPC failures, and audit persistence failures.
- [ ] Run dependency and secret scanning and review all deployment environment variables.

## Required before mainnet

- [ ] Independent contract and application security review.
- [ ] Explicit per-transaction user approval and a documented revoke/stop procedure.
- [ ] Confirm no server-side private key or seed phrase custody. Use wallet-managed signing or a separately reviewed managed signer with strict policy controls.
- [ ] Validate fee calculations and actual fee transfers against testnet receipts for buys and sells; disclose rounding and exclusions.
- [ ] Confirm kill switch, spending limits, transaction simulation, nonce/replay protection, and incident response.
- [ ] Obtain explicit human release approval. Mainnet execution is not enabled by this repository's current code.

## Key management

Use separate secrets per environment. Store them only in Vercel/Supabase server-side secret settings. Rotate the scheduler secret after exposure or staff changes. Never commit .env.local, RPC provider credentials, wallet secrets, or service-role keys. Do not log authorization headers, signed payloads, or secrets.
