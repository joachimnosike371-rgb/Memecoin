# Zero Capital Farm

Mobile-first dashboard foundation for a multi-chain token operations system.

## Current state

- Responsive operations dashboard and chain status cards.
- Local token-launch draft form; it does not deploy contracts.
- Health endpoint at `/api/health`.
- Simulation-only defaults; live execution is not implemented or enabled.
- Target fee policy: 1% buy / 1% sell. Enforcement depends on the actual token contract or launch venue; arbitrary external trades cannot be assumed taxable.
- Ethereum, BNB Chain, and Solana are planned adapters, not connected integrations.

## Run locally

Requires Node.js 20 or later.

```sh
npm install
cp .env.example .env.local
npm run typecheck
npm run build
npm run dev
```

## Next engineering steps

1. Add automated tests and validate the build in CI.
2. Implement durable storage and an audit-event schema.
3. Add market-data providers with source attribution and rate limits.
4. Implement chain-specific testnet adapters and wallet approval flows.
5. Validate fee mechanics against the target launch venue and contract architecture.
6. Add authenticated, idempotent scheduling and monitoring.
7. Complete security review, key management, and testnet end-to-end tests.

Never commit private keys or API secrets. Do not enable mainnet transactions until testnet behavior, fee accounting, access control, and user approval flows are reviewed and explicitly approved.
