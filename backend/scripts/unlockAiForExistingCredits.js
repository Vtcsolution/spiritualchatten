/**
 * One-time fix: the earlier migration command relied on a `lastTopup` field
 * that was never actually saved to the database (it wasn't declared in the
 * Wallet schema, so Mongoose silently dropped it on every update). That
 * command matched nothing and did nothing.
 *
 * This script instead sets hasEverPurchased = true directly for every
 * wallet that currently holds more than the 2 free signup credits — a
 * reliable signal that a real top-up happened, since 2 is the only amount
 * ever auto-granted.
 *
 * Run from the backend/ directory so it picks up the real .env:
 *
 *   cd /var/www/livecoach/backend
 *   node scripts/unlockAiForExistingCredits.js
 *
 * Prints exactly which wallets were changed. Safe to run more than once.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const User = require("../models/User");

async function main() {
  await mongoose.connect(process.env.DB_MONGODB_URL);
  console.log("Connected to MongoDB.\n");

  const candidates = await Wallet.find({
    credits: { $gt: 2 },
    hasEverPurchased: { $ne: true },
  });

  if (candidates.length === 0) {
    console.log("No wallets needed fixing (either already correct, or none have more than 2 credits).");
  } else {
    console.log(`Found ${candidates.length} wallet(s) with more than 2 credits but hasEverPurchased not set:\n`);
    for (const wallet of candidates) {
      const user = await User.findById(wallet.userId).select("username email");
      wallet.hasEverPurchased = true;
      await wallet.save();
      console.log(`  ✅ Fixed: ${user?.username || wallet.userId} (${user?.email || "unknown email"}) — credits: ${wallet.credits}`);
    }
  }

  // Show Amos's account specifically if findable, so this can be confirmed directly
  const amos = await User.findOne({ email: /sint-?jago/i }).select("username email");
  if (amos) {
    const wallet = await Wallet.findOne({ userId: amos._id });
    console.log(`\nAmos's account (${amos.email}): credits=${wallet?.credits}, hasEverPurchased=${wallet?.hasEverPurchased}`);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
