const Wallet = require("../models/Wallet");

// Wallet.lock is shared across every code path that touches a wallet (chat
// requests, the credit-deduction cron, timer routes/middleware, cleanup
// service). If any of those throws before resetting it, the wallet stays
// locked forever and every future request here -- including clicking "Stop
// Paid Session" -- fails immediately with a locked-wallet error, even
// though nothing is actually in progress. A wallet was found stuck locked
// in production for 3+ days from exactly this. Treat a lock older than
// this as stale and auto-recover, the same pattern already used by
// handleWalletLock in controllers/PaidTimer/chatRequestController.js.
const STALE_WALLET_LOCK_MS = 20000;

async function acquireWalletLock(userId, { maxAttempts = 8, delayMs = 250 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const wallet = await Wallet.findOneAndUpdate(
      { userId, lock: false },
      { $set: { lock: true } },
      { new: true }
    );
    if (wallet) return wallet;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // Every attempt found the wallet already locked. If that lock is older
  // than any real hold time, it's leftover from a crashed/interrupted
  // request -- take it over instead of failing forever.
  const stuck = await Wallet.findOne({ userId, lock: true });
  if (stuck) {
    const lockAgeMs = Date.now() - new Date(stuck.updatedAt || 0).getTime();
    if (lockAgeMs >= STALE_WALLET_LOCK_MS) {
      console.warn(`⚠️ Wallet ${userId} had a stale lock (${Math.round(lockAgeMs / 1000)}s old) — auto-recovering.`);
      return Wallet.findOneAndUpdate(
        { userId },
        { $set: { lock: true } },
        { new: true }
      );
    }
  }

  return null;
}

module.exports = { acquireWalletLock, STALE_WALLET_LOCK_MS };
