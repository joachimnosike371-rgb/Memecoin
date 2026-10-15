-- Durable, append-only audit events. Apply with the Supabase migration workflow.
create extension if not exists pgcrypto;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'draft.saved', 'market.snapshot', 'wallet.approval.requested',
    'wallet.approval.granted', 'wallet.approval.denied', 'transaction.submitted',
    'transaction.confirmed', 'transaction.failed', 'scheduler.started',
    'scheduler.skipped', 'scheduler.failed', 'fee.validation'
  )),
  actor text not null check (char_length(actor) between 1 and 128),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  occurred_at timestamptz not null default now(),
  chain text null check (chain is null or chain in ('ethereum-sepolia', 'bnb-testnet', 'solana-devnet')),
  entity_id text null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (actor, idempotency_key)
);

create index if not exists audit_events_occurred_at_idx on public.audit_events (occurred_at desc);
create index if not exists audit_events_type_occurred_idx on public.audit_events (event_type, occurred_at desc);

alter table public.audit_events enable row level security;

-- No client policies by default: only trusted server-side service-role access is permitted.
-- Do not expose the Supabase service role key to browsers.
