const NETWORKS = Object.freeze({
  ethereum: { id: "ethereum-sepolia", family: "evm", chainId: 11155111, rpcEnv: "ETHEREUM_RPC_URL" },
  bnb: { id: "bnb-testnet", family: "evm", chainId: 97, rpcEnv: "BNB_RPC_URL" },
  solana: { id: "solana-devnet", family: "solana", cluster: "devnet", rpcEnv: "SOLANA_RPC_URL" }
});

export function getTestnetAdapter(chain, env = process.env) {
  const config = NETWORKS[chain];
  if (!config) throw new TypeError("Unsupported chain adapter");
  const rpcUrl = env[config.rpcEnv];
  if (!rpcUrl) throw new Error(`Missing testnet RPC configuration: ${config.rpcEnv}`);
  const parsed = new URL(rpcUrl);
  if (parsed.protocol !== "https:") throw new TypeError("Testnet RPC URL must use HTTPS");
  return Object.freeze({ ...config, rpcUrl, liveExecutionEnabled: false });
}

export function createWalletApprovalRequest({ chain, account, destination, payload, amount = "0" }) {
  const config = NETWORKS[chain];
  if (!config) throw new TypeError("Unsupported chain");
  if (typeof account !== "string" || !account.trim()) throw new TypeError("Wallet account is required");
  if (typeof destination !== "string" || !destination.trim()) throw new TypeError("Transaction destination is required");
  if (typeof payload !== "string" || !payload.trim()) throw new TypeError("Transaction payload is required");
  if (!/^(0|[1-9]\d*)$/.test(amount)) throw new TypeError("Amount must be an integer string in base units");
  if (config.family === "evm" && (!/^0x[a-fA-F0-9]{40}$/.test(account) || !/^0x[a-fA-F0-9]{40}$/.test(destination))) {
    throw new TypeError("EVM account and destination must be 20-byte hex addresses");
  }
  return Object.freeze({
    id: crypto.randomUUID(),
    chain: config.id,
    family: config.family,
    expectedChainId: config.chainId ?? null,
    expectedCluster: config.cluster ?? null,
    account,
    destination,
    payload,
    amount,
    state: "awaiting-wallet-approval",
    createdAt: new Date().toISOString(),
    executionEnabled: false
  });
}

/** Record a client wallet's response only after checking chain/account and tx reference shape. */
export function resolveWalletApproval(request, response) {
  if (!request || request.state !== "awaiting-wallet-approval") throw new Error("Approval request is not pending");
  if (!response || typeof response.approved !== "boolean") throw new TypeError("Explicit wallet decision is required");
  if (response.account !== request.account || response.chain !== request.chain) {
    throw new Error("Wallet account or network does not match the requested transaction");
  }
  if (response.approved && (typeof response.transactionRef !== "string" || !response.transactionRef.trim())) {
    throw new TypeError("Approved response requires a transaction reference");
  }
  return Object.freeze({
    ...request,
    state: response.approved ? "wallet-approved-awaiting-chain-verification" : "wallet-rejected",
    transactionRef: response.approved ? response.transactionRef : null,
    resolvedAt: new Date().toISOString(),
    executionEnabled: false
  });
}
