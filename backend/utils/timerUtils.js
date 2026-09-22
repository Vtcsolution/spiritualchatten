const mongoose = require("mongoose");
const ActiveSession = require("../models/ActiveSession");
const Wallet = require("../models/Wallet");
const User = require("../models/User");

const freeMinutes = 1;

// `allowFreeMinute: false` skips the free timed-minute grant entirely (used
// for AI Coach chats — that free minute stays reserved for human coaches).
// Otherwise AI Coach spends from the same shared `credits` balance as human
// coaches, including the free signup credit.
const checkAndUpdateTimer = async (userId, psychicId, { allowFreeMinute = true, creditField = "credits" } = {}) => {
  const now = new Date();
  const user = await User.findById(userId);

  // Check if user has a free minute
  if (allowFreeMinute && !user.hasUsedFreeMinute) {
    let session = await ActiveSession.findOne({ userId, psychicId });

    if (!session) {
      session = await ActiveSession.create({
        userId,
        psychicId,
        startTime: now,
        freeEndTime: new Date(now.getTime() + freeMinutes * 60000),
        remainingFreeTime: freeMinutes * 60,
        lastChargeTime: now,
        freeSessionUsed: false,
        isArchived: false,
      });
    }

    if (now < session.freeEndTime) {
      console.log(`[Timer] Free session active for user ${userId}: ${session.remainingFreeTime} seconds remaining`);
      return { available: true, isFree: true, message: "Free minute active" };
    }

    // Mark free minute as used
    await User.updateOne({ _id: userId }, { hasUsedFreeMinute: true });
    session.freeSessionUsed = true;
    session.isArchived = true;
    await session.save();
  }

  // Check wallet for paid session
  const wallet = await Wallet.findOne({ userId });
  const balance = wallet ? (wallet[creditField] || 0) : 0;
  if (!wallet || balance <= 0) {
    console.log(`[Timer] No ${creditField} available for user ${userId}`);
    return { available: false, message: "Purchase credits to continue chatting." };
  }

  // (userId, psychicId) is a unique index -- there is only ever one
  // ActiveSession document per pair, reused and mutated in place, so the
  // lookup itself can't filter on isArchived (that would collide with the
  // unique index on the create-if-missing path below). Instead, every
  // paidSession check further down explicitly requires !isArchived too --
  // see the comment there for why that matters.
  let session = await ActiveSession.findOne({ userId, psychicId });
  if (!session) {
    session = await ActiveSession.create({
      userId,
      psychicId,
      startTime: now,
      // freeEndTime is a required field on the schema even though this
      // session skips the free-minute phase entirely (e.g. AI Coach, which
      // never creates the free-session document first) -- `now` marks it
      // as already elapsed/not applicable, matching remainingFreeTime: 0.
      freeEndTime: now,
      remainingFreeTime: 0,
      lastChargeTime: now,
      freeSessionUsed: true,
      isArchived: false,
      paidSession: true,
      paidStartTime: now,
      initialCredits: balance, // Initialize with current credits
    });
    console.log(`[Timer] New paid session created for user ${userId} with ${balance} ${creditField}`);
  }

  // !session.isArchived matters here: a session can be left with
  // paidSession still true after being archived (if some other code path
  // reactivates the document later without resetting isArchived). Without
  // this guard, that stale record gets read as an active paid session
  // forever, and the deduction math below recomputes the wallet balance
  // from its frozen initialCredits/paidStartTime -- silently overwriting
  // any credits added since (including admin top-ups) back down to
  // whatever that stale math produces.
  if (!session.isArchived && session.paidSession && session.paidStartTime) {
    const secondsSinceStart = Math.floor((now - session.paidStartTime) / 1000);
    const remainingTime = session.initialCredits * 60 - secondsSinceStart;

    console.log(`[Timer] Paid session check for user ${userId}: ${remainingTime} seconds remaining, initialCredits: ${session.initialCredits}`);

    if (remainingTime > 0) {
      return { available: true, isFree: false, remainingTime };
    }

    // If time is up, try to deduct more credits to extend session
    if (balance >= 1) {
      await Wallet.updateOne(
        { userId, lock: false },
        { $inc: { [creditField]: -1 }, $set: { lock: false } }
      );
      session.paidStartTime = now; // Reset timer for new credit
      session.initialCredits = 1; // Allocate 1 credit for new period
      session.isArchived = false;
      await session.save();
      console.log(`[Timer] Extended paid session for user ${userId} with 1 new ${creditField}`);
      return { available: true, isFree: false, remainingTime: 60 };
    }

    // No credits left to extend session
    await ActiveSession.updateOne(
      { _id: session._id },
      { paidSession: false, paidStartTime: null, isArchived: true }
    );
    console.log(`[Timer] Paid session expired for user ${userId}`);
    return { available: false, message: "Purchase credits to continue chatting." };
  }

  // Start new paid session if credits available
  const minutesToCharge = Math.ceil((now - session.lastChargeTime) / 60000);
  if (minutesToCharge >= 1) {
    if (balance < minutesToCharge) {
      console.log(`[Timer] Insufficient ${creditField} for user ${userId}: need ${minutesToCharge}, have ${balance}`);
      return { available: false, message: "Purchase credits to continue chatting." };
    }
    await Wallet.updateOne(
      { userId, lock: false },
      { $inc: { [creditField]: -minutesToCharge }, $set: { lock: false } }
    );
    session.lastChargeTime = now;
    session.paidSession = true;
    session.paidStartTime = now;
    session.initialCredits = minutesToCharge; // Set initialCredits for new paid session
    session.isArchived = false;
    await session.save();
    console.log(`[Timer] Deducted ${minutesToCharge} ${creditField} for user ${userId}, new paid session started`);
  }

  return { available: true, isFree: false, remainingTime: session.initialCredits * 60 };
};

module.exports = { checkAndUpdateTimer };