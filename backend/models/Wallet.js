const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  credits: {
    type: Number,
    default: 0,
    min: 0,
  },
  // True once this wallet has ever received real (or admin-granted) paid
  // credits — as opposed to only the 2 free signup credits. The AI Coach
  // requires this to be true before it will spend from `credits` at all,
  // so the free signup grant alone can never unlock/pay for it, while any
  // purchase (which tops up the same `credits` balance) immediately does.
  hasEverPurchased: { type: Boolean, default: false },
  lock: { type: Boolean, default: false }, // For concurrent update prevention
}, { timestamps: true });

// Index for performance
walletSchema.index({ userId: 1, lock: 1 }); // Optimize queries for wallet updates

// Pre-save validation to ensure consistency
walletSchema.pre("save", function (next) {
  if (this.credits < 0) {
    return next(new Error("Credits cannot be negative"));
  }
  if (this.balance < 0) {
    return next(new Error("Balance cannot be negative"));
  }
  next();
});

module.exports = mongoose.model("Wallet", walletSchema);