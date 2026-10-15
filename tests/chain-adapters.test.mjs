import test from "node:test";
import assert from "node:assert/strict";
import { createWalletApprovalRequest, getTestnetAdapter, resolveWalletApproval } from "../lib/testnet-adapters.mjs";

test("testnet adapters require HTTPS RPC endpoints and keep execution disabled", () => {
  assert.equal(getTestnetAdapter("ethereum", { ETHEREUM_RPC_URL: "https://rpc.example.test" }).chainId, 11155111);
  assert.equal(getTestnetAdapter("bnb", { BNB_RPC_URL: "https://rpc.example.test" }).chainId, 97);
  assert.equal(getTestnetAdapter("solana", { SOLANA_RPC_URL: "https://rpc.example.test" }).cluster, "devnet");
  assert.throws(() => getTestnetAdapter("ethereum", {}), /Missing testnet RPC/);
  assert.throws(() => getTestnetAdapter("bnb", { BNB_RPC_URL: "http://rpc.example.test" }), /HTTPS/);
});

test("wallet approval request is bound to expected EVM account and chain", () => {
  const account = "0x1111111111111111111111111111111111111111";
  const destination = "0x2222222222222222222222222222222222222222";
  const request = createWalletApprovalRequest({ chain: "ethereum", account, destination, payload: "0x1234", amount: "0" });
  assert.equal(request.state, "awaiting-wallet-approval");
  assert.equal(request.executionEnabled, false);
  assert.throws(() => resolveWalletApproval(request, { approved: true, account, chain: "bnb-testnet", transactionRef: "0xabc" }), /does not match/);
  const denied = resolveWalletApproval(request, { approved: false, account, chain: "ethereum-sepolia" });
  assert.equal(denied.state, "wallet-rejected");
  assert.equal(denied.executionEnabled, false);
});

test("approval request rejects malformed address and amount values", () => {
  assert.throws(() => createWalletApprovalRequest({ chain: "ethereum", account: "bad", destination: "bad", payload: "0x", amount: "-1" }), /Amount/);
  assert.throws(() => createWalletApprovalRequest({ chain: "ethereum", account: "bad", destination: "bad", payload: "0x" }), /EVM account/);
});
