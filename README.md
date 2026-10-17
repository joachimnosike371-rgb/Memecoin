# Zero Capital Farm

Mobile-first dashboard foundation for a multi-chain token operations system.

## Current state

- Responsive operations dashboard, chain status cards, local launch-draft persistence, and CSV export of dashboard journal records.
- Health endpoint at `/api/health`.
- Simulation-only defaults; live execution is not implemented or enabled.
- Target fee policy: 1% buy / 1% sell (100 basis points). The tested policy helper calculates fees only; it does not collect them. Enforcement depends on the actual token contract or launch venue; arbitrary external trades cannot be assumed taxable.
- Testnet adapter configuration supports Ethereum Sepolia (chain ID 11155111), BNB testnet (chain ID 97), and Solana devnet RPC endpoints. Wallet approval request/response validation is implemented as a safety foundation, but it does not broadcast transactions or connect a wallet UI. No mainnet transaction is enabled.
- Automated Node.js tests cover audit-event validation, integer fee calculations, fee verification gating, market-source attribution/rate limits, testnet configuration, and wallet approval state checks.
- Supabase migration at `supabase/migrations/202610150001_audit_events.sql` defines durable append-only audit events with idempotency uniqueness and RLS enabled. Apply the migration to a Supabase project before treating storage as durable in a deployed environment.
- X narrative discovery endpoint (`GET /api/narratives`) searches recent X API v2 posts and ranks topics using mention frequency, engagement, and recency. It requires `X_BEARER_TOKEN` and valid X API access; no credential is bundled. The ranking is a heuristic signal, not a prediction of price or profitability.
- Grok concept endpoint (`POST /api/concepts`) uses the xAI API (`XAI_API_KEY`, optional `XAI_MODEL`) to generate draft token concepts. The dashboard can select a narrative, generate concepts, and load a concept into the local draft. Concepts are not deployed or endorsed as investments.
- Authenticated scheduler heartbeat (`GET /api/agent/loop`) uses `CRON_SECRET` and performs narrative discovery only. It is not a 24/7 autonomous trading agent and intentionally cannot sign or broadcast transactions.
- Market provider wrapper returns source URL and fetch timestamp and enforces a process-local rolling-window cap. For multi-instance production scheduling, use shared/distributed rate limiting and provider-specific quotas.

## New narrative and concept endpoints\n\n- `GET /api/narratives` — live X topic ranking; returns a provider-not-configured response until `X_BEARER_TOKEN` is set.\n- `POST /api/concepts` — Grok concept generation. Send JSON such as `{ "narrative": "solana memes", "examples": [] }`; requires `XAI_API_KEY`.\n- `GET /api/agent/loop` — scheduler-authenticated discovery heartbeat using `Authorization: Bearer <CRON_SECRET>`. Do not put secrets in a public URL.\n\nMainnet token deployment, swaps, automated rotation, on-chain fee collection, and a verified 24/7 cycle remain disabled/unimplemented. They require a selected deployment venue and audited transaction contracts, wallet-signing and explicit approval flows, testnet end-to-end verification, monitoring, and security review. A token fee target does not collect fees from external trades by itself.\n\n## Run locally

Requires Node.js 20 or later.

```sh
npm install
cp .env.example .env.local
npm test
npm run typecheck
npm run build
npm run dev
```

## Security and deployment gates

1. Configure Supabase server-side access with a service-role key stored only in server environment variables; never expose it to the browser.
2. Connect real market providers only with documented API limits, attribution, timeout handling, and shared rate limits appropriate to provider quotas.
3. Connect the approval-request layer to wallet providers (EVM wallet connector and Solana wallet adapter), verify returned signatures/transaction receipts on the selected testnet, and never request or store seed phrases/private keys.
4. Verify fee behavior against the selected launch venue and deployed contract on testnet. A displayed 1% target is not proof of fee collection.
5. Add authenticated scheduling with constant-time secret comparison, replay/idempotency protection, bounded work, and alerting before enabling any automated loop.
6. Run testnet end-to-end tests and independent security review before considering mainnet.

Never commit private keys or API secrets. Do not enable mainnet transactions, deploy tokens, or move funds until testnet behavior, fee accounting, access control, and user approval flows are reviewed and explicitly approved.
