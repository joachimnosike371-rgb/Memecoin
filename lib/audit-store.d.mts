export interface AuditEventInput {
  type: string;
  actor: string;
  idempotencyKey: string;
  chain?: "ethereum-sepolia" | "bnb-testnet" | "solana-devnet" | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}
export interface AuditEventWriteResult {
  event: Readonly<{
    id: string;
    type: string;
    actor: string;
    idempotencyKey: string;
    occurredAt: string;
    chain: string | null;
    entityId: string | null;
    metadata: Record<string, unknown>;
  }>;
  persisted: boolean;
  duplicate: boolean;
}
export function appendAuditEvent(
  input: AuditEventInput,
  options?: {
    now?: Date;
    env?: Record<string, string | undefined>;
    fetcher?: typeof fetch;
  }
): Promise<AuditEventWriteResult>;
export function isAuditStorageConfigured(env?: Record<string, string | undefined>): boolean;
