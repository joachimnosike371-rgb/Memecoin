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
- Market provider wrapper returns source URL and fetch timestamp and enforces a process-local rolling-window cap. For multi-instance production scheduling, use shared/distributed rate limiting and provider-specific quotas.

## Run locally

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
