export const TARGET_FEE_BPS = Object.freeze({ buy: 100, sell: 100 });

export function calculateTargetFee(amountMinor, side) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new TypeError("amountMinor must be a non-negative safe integer");
  if (side !== "buy" && side !== "sell") throw new TypeError("side must be buy or sell");
  // Integer arithmetic avoids floating-point fee drift. Rounds down to the smallest unit.
  return Math.floor((amountMinor * TARGET_FEE_BPS[side]) / 10_000);
}

/** A venue must be explicitly reviewed; a UI setting alone cannot collect a fee. */
export function validateFeeVenue({ venue, feeHookVerified, contractVerified }) {
  if (typeof venue !== "string" || !venue.trim()) throw new TypeError("venue is required");
  return Object.freeze({
    venue: venue.trim(),
    targetBuyBps: TARGET_FEE_BPS.buy,
    targetSellBps: TARGET_FEE_BPS.sell,
    enforceable: feeHookVerified === true || contractVerified === true,
    status: feeHookVerified === true || contractVerified === true ? "verified" : "unverified",
    note: "Fee collection is not enabled by this policy module; verify venue/contract semantics and testnet transactions."
  });
}
