const schedule = require("node-schedule");
const ActiveSession = require("../models/ActiveSession");
const ActiveCallSession = require("../models/CallSession/ActiveCallSession");
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const CallSession = require("../models/CallSession/CallSession");
const Psychic = require('../models/HumanChat/Psychic');

// Simple lock manager to prevent concurrent processing
const processingLocks = new Set();

// Start credit deduction job
const startCreditDeductionJob = (io) => {
  // Run every 30 seconds
  schedule.scheduleJob("*/30 * * * * *", async () => {
    try {
      const now = new Date();
      console.log(`[Credit Job] Running at ${now.toISOString()}`);
      
      // 1. Process Chat Sessions
      const chatSessions = await ActiveSession.find({
        paidSession: true,
        paidStartTime: { $exists: true, $ne: null },
        isArchived: false,
        lock: false
      }).limit(20).lean();

      for (const session of chatSessions) {
        await processChatSession(session, io, now);
      }
      
      // 2. Process Audio Call Sessions
      const audioSessions = await ActiveCallSession.find({
        status: 'in-progress',
        startTime: { $exists: true, $ne: null },
        isArchived: false,
        lock: false
      }).limit(20).lean();

      for (const session of audioSessions) {
        await processAudioSession(session, io, now);
      }

    } catch (error) {
      console.error("[Credit Job] General error:", error);
    }
  });
};

// Process Chat Session - NO TRANSACTIONS
async function processChatSession(session, io, now) {
  const lockKey = `chat_${session._id}`;
  
  if (processingLocks.has(lockKey)) {
    console.log(`[Credit Job] Chat session ${session._id} already being processed`);
    return;
  }
  
  try {
    processingLocks.add(lockKey);
    
    // Use atomic operation to lock the session
    const lockedSession = await ActiveSession.findOneAndUpdate(
      { 
        _id: session._id, 
        lock: false,
        isArchived: false
      },
      { 
        $set: { 
          lock: true,
          lastProcessed: now
        } 
      },
      { new: true }
    );

    if (!lockedSession) {
      console.log(`[Credit Job] Chat session ${session._id} already locked`);
      return;
    }

    // Get user's wallet WITHOUT session
    const wallet = await Wallet.findOne({ userId: session.userId });
    
    if (!wallet) {
      console.log(`[Credit Job] Wallet for user ${session.userId} not found`);
      await ActiveSession.updateOne({ _id: session._id }, { $set: { lock: false } });
      return;
    }

    // Calculate elapsed time
    const elapsedSeconds = Math.floor((now - session.paidStartTime) / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    
    // Determine if we should deduct a credit
    const creditsToDeduct = elapsedMinutes - (session.lastDeductedMinute || 0);
    
    if (creditsToDeduct > 0 && wallet.credits >= creditsToDeduct) {
      // Deduct credits using atomic operation
      const updatedWallet = await Wallet.findOneAndUpdate(
        { 
          _id: wallet._id,
          credits: { $gte: creditsToDeduct }
        },
        { 
          $inc: { credits: -creditsToDeduct }, // FIXED: creditsToDuct -> creditsToDeduct
          $set: { lastDeduction: now }
        },
        { new: true }
      );
      
      if (updatedWallet) {
        // Update session tracking
        await ActiveSession.updateOne(
          { _id: session._id },
          {
            $set: { 
              lastDeductedMinute: elapsedMinutes,
              lastChargeTime: now
            }
          }
        );
        
        // Emit update
        if (io) {
          io.to(session.userId.toString()).emit("creditsUpdate", {
            userId: session.userId,
            credits: updatedWallet.credits,
            deducted: creditsToDeduct,
            timestamp: now,
            sessionType: "chat"
          });
        }
        
        console.log(`[Credit Job] Chat: Deducted ${creditsToDeduct} credit(s) for user ${session.userId}, remaining: ${updatedWallet.credits}`);
      }
    }

    // Calculate remaining time
    const totalPaidSeconds = session.initialCredits * 60;
    const remainingTime = Math.max(0, totalPaidSeconds - elapsedSeconds);
    const remainingCredits = Math.max(0, Math.floor(remainingTime / 60));

    // Update frontend
    if (io) {
      io.to(session.userId.toString()).emit("sessionUpdate", {
        sessionId: session._id,
        userId: session.userId,
        psychicId: session.psychicId,
        sessionType: "chat",
        isFree: false,
        remainingFreeTime: 0,
        paidTimer: remainingTime,
        credits: wallet.credits,
        status: wallet.credits > 0 ? "paid" : "insufficient_credits",
        showFeedbackModal: wallet.credits <= 0,
        freeSessionUsed: true,
        lastUpdated: now
      });
    }

    // End session if no credits or time remaining
    if (wallet.credits <= 0 || remainingTime <= 0) {
      console.log(`[Credit Job] Ending chat session ${session._id}`);
      
      await ActiveSession.updateOne(
        { _id: session._id },
        {
          $set: {
            paidSession: false,
            paidStartTime: null,
            isArchived: true,
            endedAt: now,
            endReason: wallet.credits <= 0 ? "insufficient_credits" : "time_completed",
            lock: false
          }
        }
      );
      
      // Notify session ended
      if (io) {
        io.to(session.userId.toString()).emit("sessionEnded", {
          sessionId: session._id,
          sessionType: "chat",
          userId: session.userId,
          reason: wallet.credits <= 0 ? "Insufficient credits" : "Session time completed",
          remainingCredits: wallet.credits
        });
      }
    } else {
      // Unlock the session
      await ActiveSession.updateOne({ _id: session._id }, { $set: { lock: false } });
    }

  } catch (error) {
    console.error(`[Credit Job] Error processing chat session ${session._id}:`, error);
    
    // Always try to unlock on error
    try {
      await ActiveSession.updateOne({ _id: session._id }, { $set: { lock: false } });
    } catch (unlockError) {
      console.error(`[Credit Job] Error unlocking session ${session._id}:`, unlockError);
    }
  } finally {
    processingLocks.delete(lockKey);
  }
}

// Process Audio Call Session - NO TRANSACTIONS
async function processAudioSession(session, io, now) {
  const lockKey = `audio_${session._id}`;
  
  if (processingLocks.has(lockKey)) {
    console.log(`[Credit Job] Audio session ${session._id} already being processed`);
    return;
  }
  
  try {
    processingLocks.add(lockKey);
    
    // Use atomic operation to lock the session
    const lockedSession = await ActiveCallSession.findOneAndUpdate(
      { 
        _id: session._id, 
        lock: false,
        isArchived: false,
        status: 'in-progress'
      },
      { 
        $set: { 
          lock: true,
          lastProcessed: now
        } 
      },
      { new: true }
    );

    if (!lockedSession) {
      console.log(`[Credit Job] Audio session ${session._id} already locked`);
      return;
    }

    // Get user's wallet WITHOUT session
    const wallet = await Wallet.findOne({ userId: session.userId });
    
    if (!wallet) {
      console.log(`[Credit Job] Wallet for audio call user ${session.userId} not found`);
      await ActiveCallSession.updateOne({ _id: session._id }, { $set: { lock: false } });
      return;
    }

    // Calculate elapsed time
    const elapsedSeconds = Math.floor((now - session.startTime) / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    
    // Determine if we should deduct a credit (every minute)
    const creditsToDeduct = elapsedMinutes - (session.lastDeductedMinute || 0);
    
    if (creditsToDeduct > 0) {
      // Check if user has enough credits
      if (wallet.credits >= creditsToDeduct) {
        // Deduct credits using atomic operation
        const updatedWallet = await Wallet.findOneAndUpdate(
          { 
            _id: wallet._id,
            credits: { $gte: creditsToDeduct }
          },
          { 
            $inc: { credits: -creditsToDeduct }, // FIXED: creditsToDuct -> creditsToDeduct
            $set: { lastDeduction: now }
          },
          { new: true }
        );
        
        if (updatedWallet) {
          // Update session tracking
          await ActiveCallSession.updateOne(
            { _id: session._id },
            {
              $set: { 
                lastDeductedMinute: elapsedMinutes,
                lastChargeTime: now
              },
              $inc: { totalCreditsUsed: creditsToDeduct }
            }
          );
          
          // Emit real-time credit update
          if (io) {
            io.to(session.userId.toString()).emit("audioCreditsUpdate", {
              sessionId: session._id,
              userId: session.userId,
              psychicId: session.psychicId,
              credits: updatedWallet.credits,
              deducted: creditsToDeduct,
              totalUsed: (session.totalCreditsUsed || 0) + creditsToDeduct,
              duration: elapsedSeconds,
              timestamp: now
            });
            
            io.to(session.psychicId.toString()).emit("audioSessionUpdate", {
              sessionId: session._id,
              userId: session.userId,
              duration: elapsedSeconds,
              creditsUsed: (session.totalCreditsUsed || 0) + creditsToDeduct,
              status: "active"
            });
          }
          
          console.log(`[Credit Job] Audio: Deducted ${creditsToDeduct} credit(s) for call ${session._id}, user ${session.userId}, remaining: ${updatedWallet.credits}`);
        }
      } else {
        // Insufficient credits - end the call
        console.log(`[Credit Job] Audio: Insufficient credits for call ${session._id}, ending call`);
        
        await ActiveCallSession.updateOne(
          { _id: session._id },
          {
            $set: {
              status: 'ended',
              endReason: 'insufficient_credits',
              endTime: now,
              isArchived: true,
              lock: false
            }
          }
        );
        
        // Create final call session record
        await createCallHistoryRecord({ 
          ...session, 
          endTime: now,
          status: 'failed', // Use 'failed' instead of 'active' for insufficient credits
          endReason: 'insufficient_credits'
        });
        
        // Notify both parties
        if (io) {
          io.to(session.roomName).emit("callEnded", {
            sessionId: session._id,
            reason: "Insufficient credits",
            duration: elapsedSeconds,
            totalCreditsUsed: session.totalCreditsUsed || 0
          });
          
          io.to(session.userId.toString()).emit("audioCallEnded", {
            sessionId: session._id,
            reason: "insufficient_credits",
            message: "Call ended due to insufficient credits",
            creditsRemaining: wallet.credits
          });
        }
        
        return;
      }
    }

    // Update call duration for both participants
    if (io) {
      io.to(session.roomName).emit("callDurationUpdate", {
        sessionId: session._id,
        duration: elapsedSeconds,
        creditsRemaining: wallet.credits,
        creditsUsed: session.totalCreditsUsed || 0
      });
    }

    // Check for maximum call duration
    const MAX_CALL_DURATION = 60 * 60; // 1 hour max
    if (elapsedSeconds >= MAX_CALL_DURATION) {
      console.log(`[Credit Job] Audio: Maximum call duration reached for ${session._id}`);
      
      await ActiveCallSession.updateOne(
        { _id: session._id },
        {
          $set: {
            status: 'ended',
            endReason: 'max_duration_reached',
            endTime: now,
            isArchived: true,
            lock: false
          }
        }
      );
      
      await createCallHistoryRecord({ 
        ...session, 
        endTime: now,
        status: 'completed',
        endReason: 'max_duration_reached'
      });
      
      if (io) {
        io.to(session.roomName).emit("callEnded", {
          sessionId: session._id,
          reason: "Maximum call duration reached",
          duration: elapsedSeconds,
          totalCreditsUsed: session.totalCreditsUsed || 0
        });
      }
    } else {
      // Unlock the session
      await ActiveCallSession.updateOne({ _id: session._id }, { $set: { lock: false } });
    }

  } catch (error) {
    console.error(`[Credit Job] Error processing audio session ${session._id}:`, error);
    
    // Always try to unlock on error
    try {
      await ActiveCallSession.updateOne({ _id: session._id }, { $set: { lock: false } });
    } catch (unlockError) {
      console.error(`[Credit Job] Error unlocking audio session ${session._id}:`, unlockError);
    }
  } finally {
    processingLocks.delete(lockKey);
  }
}

// Create call history record - NO TRANSACTIONS
async function createCallHistoryRecord(session) {
  try {
    // Get psychic to get their rate
    const psychic = await Psychic.findById(session.psychicId).select('callRatePerMin');
    
    // Determine correct status based on end reason
    let callStatus = session.status || 'completed';
    let callEndReason = session.endReason || 'completed_normally';
    
    // If status is not valid for final record, adjust it
    if (session.status === 'in-progress' || session.status === 'active') {
      if (session.endReason === 'insufficient_credits') {
        callStatus = 'failed';
        callEndReason = 'insufficient_credits';
      } else if (session.endReason === 'max_duration_reached') {
        callStatus = 'completed';
        callEndReason = 'completed_normally';
      } else if (session.endReason === 'abandoned') {
        callStatus = 'failed';
        callEndReason = 'participant_disconnected';
      } else if (session.endReason === 'free_time_ended') {
        callStatus = 'completed';
        callEndReason = 'completed_normally';
      } else {
        callStatus = 'completed';
        callEndReason = 'completed_normally';
      }
    }
    
    // Get the psychic's rate - use a default if not set
    const ratePerMin = psychic?.callRatePerMin || 1;
    const creditsPerMin = psychic?.callRatePerMin || 1;
    
    const callHistory = new CallSession({
      roomName: session.roomName,
      userId: session.userId,
      psychicId: session.psychicId,
      startTime: session.startTime,
      endTime: session.endTime || new Date(),
      durationSeconds: Math.floor(((session.endTime || new Date()) - session.startTime) / 1000),
      totalCreditsUsed: session.totalCreditsUsed || 0,
      creditsPerMin: creditsPerMin,
      ratePerMin: ratePerMin,
      status: callStatus,
      endReason: callEndReason,
      twilioRoomSid: session.twilioRoomSid,
      recordingUrl: session.recordingUrl
    });
    
    await callHistory.save();
    console.log(`[Credit Job] Created call history record for session ${session._id}, status: ${callStatus}, reason: ${callEndReason}`);
  } catch (error) {
    console.error(`[Credit Job] Error creating call history:`, error);
  }
}

// Start free session timer job
const startFreeSessionTimerJob = (io) => {
  // Run every 30 seconds
  schedule.scheduleJob("*/30 * * * * *", async () => {
    try {
      const now = new Date();
      console.log(`[Free Session Job] Running at ${now.toISOString()}`);
      
      // Process Chat Free Sessions
      const chatSessions = await ActiveSession.find({
        freeSessionUsed: false,
        isArchived: false,
        lock: false,
        freeEndTime: { $exists: true, $gt: now }
      }).limit(20).lean();

      for (const session of chatSessions) {
        await processFreeChatSession(session, io, now);
      }
      
      // Process Audio Free Sessions
      const audioSessions = await ActiveCallSession.find({
        isFreeSession: true,
        freeSessionUsed: false,
        isArchived: false,
        lock: false,
        freeEndTime: { $exists: true, $gt: now }
      }).limit(20).lean();

      for (const session of audioSessions) {
        await processFreeAudioSession(session, io, now);
      }

    } catch (error) {
      console.error("[Free Session Job] General error:", error);
    }
  });
};

// Process Free Chat Session - NO TRANSACTIONS
async function processFreeChatSession(session, io, now) {
  const lockKey = `free_chat_${session._id}`;
  
  if (processingLocks.has(lockKey)) return;
  
  try {
    processingLocks.add(lockKey);
    
    // Acquire lock
    const lockedSession = await ActiveSession.findOneAndUpdate(
      { 
        _id: session._id, 
        lock: false 
      },
      { $set: { lock: true } },
      { new: true }
    );

    if (!lockedSession) return;

    // Check user's free minute status
    const user = await User.findById(session.userId);
    if (!user || user.hasUsedFreeMinute) {
      await ActiveSession.updateOne(
        { _id: session._id },
        {
          $set: {
            freeSessionUsed: true,
            isArchived: true,
            lock: false
          }
        }
      );
      return;
    }

    // Calculate remaining time
    const remainingFreeTime = Math.max(0, Math.floor((session.freeEndTime - now) / 1000));
    
    if (remainingFreeTime <= 0) {
      // Free time ended
      await ActiveSession.updateOne(
        { _id: session._id },
        {
          $set: {
            freeSessionUsed: true,
            isArchived: true,
            lock: false
          }
        }
      );
      
      await User.updateOne(
        { _id: session.userId }, 
        { hasUsedFreeMinute: true }
      );
      
      console.log(`[Free Session Job] Free chat session ended for user ${session.userId}`);
    } else {
      // Update session with remaining time
      await ActiveSession.updateOne(
        { _id: session._id },
        {
          $set: {
            remainingFreeTime: remainingFreeTime,
            lock: false
          }
        }
      );
    }

    // Get wallet for credits display
    const wallet = await Wallet.findOne({ userId: session.userId });
    
    // Emit update
    if (io) {
      io.to(session.userId.toString()).emit("sessionUpdate", {
        sessionId: session._id,
        userId: session.userId,
        psychicId: session.psychicId,
        sessionType: "chat",
        isFree: remainingFreeTime > 0,
        remainingFreeTime,
        paidTimer: 0,
        credits: wallet?.credits || 0,
        status: remainingFreeTime > 0 ? "free" : "stopped",
        freeSessionUsed: remainingFreeTime <= 0,
        showFeedbackModal: remainingFreeTime <= 0,
        lastUpdated: now
      });
    }

  } catch (error) {
    console.error(`[Free Session Job] Error processing free chat session ${session._id}:`, error);
  } finally {
    // Always release lock
    try {
      await ActiveSession.updateOne({ _id: session._id }, { $set: { lock: false } });
    } catch (lockError) {
      console.error(`[Free Session Job] Error releasing lock:`, lockError);
    }
    processingLocks.delete(lockKey);
  }
}

// Process Free Audio Session - NO TRANSACTIONS
async function processFreeAudioSession(session, io, now) {
  const lockKey = `free_audio_${session._id}`;
  
  if (processingLocks.has(lockKey)) return;
  
  try {
    processingLocks.add(lockKey);
    
    // Acquire lock
    const lockedSession = await ActiveCallSession.findOneAndUpdate(
      { 
        _id: session._id, 
        lock: false 
      },
      { $set: { lock: true } },
      { new: true }
    );

    if (!lockedSession) return;

    // Check user's free audio minute status
    const user = await User.findById(session.userId);
    if (!user || user.hasUsedFreeAudioMinute) {
      await ActiveCallSession.updateOne(
        { _id: session._id },
        {
          $set: {
            freeSessionUsed: true,
            isArchived: true,
            lock: false
          }
        }
      );
      return;
    }

    // Calculate remaining free audio time
    const remainingFreeTime = Math.max(0, Math.floor((session.freeEndTime - now) / 1000));
    
    if (remainingFreeTime <= 0) {
      // Free audio time ended
      await ActiveCallSession.updateOne(
        { _id: session._id },
        {
          $set: {
            freeSessionUsed: true,
            isArchived: true,
            status: 'ended',
            endReason: 'free_time_ended',
            endTime: now,
            lock: false
          }
        }
      );
      
      await User.updateOne(
        { _id: session.userId }, 
        { hasUsedFreeAudioMinute: true }
      );
      
      console.log(`[Free Session Job] Free audio session ended for user ${session.userId}`);
      
      // Create call history for free session
      await createCallHistoryRecord({ 
        ...session, 
        endTime: now,
        status: 'completed',
        endReason: 'completed_normally'
      });
    } else {
      // Update session with remaining time
      await ActiveCallSession.updateOne(
        { _id: session._id },
        {
          $set: {
            remainingFreeTime: remainingFreeTime,
            lock: false
          }
        }
      );
    }

    // Emit update to both participants
    if (io) {
      io.to(session.roomName).emit("freeAudioSessionUpdate", {
        sessionId: session._id,
        userId: session.userId,
        psychicId: session.psychicId,
        remainingFreeTime,
        isFree: remainingFreeTime > 0,
        status: remainingFreeTime > 0 ? "free_audio" : "ended"
      });
    }

  } catch (error) {
    console.error(`[Free Session Job] Error processing free audio session ${session._id}:`, error);
  } finally {
    // Always release lock
    try {
      await ActiveCallSession.updateOne({ _id: session._id }, { $set: { lock: false } });
    } catch (lockError) {
      console.error(`[Free Session Job] Error releasing lock:`, lockError);
    }
    processingLocks.delete(lockKey);
  }
}

// Start call cleanup job
const startCallCleanupJob = (io) => {
  // Run every 5 minutes
  schedule.scheduleJob("*/5 * * * *", async () => {
    try {
      const now = new Date();
      console.log(`[Call Cleanup Job] Running at ${now.toISOString()}`);
      
      // Clean up abandoned call sessions
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      
      const abandonedSessions = await ActiveCallSession.find({
        status: 'in-progress',
        lastProcessed: { $lt: tenMinutesAgo },
        isArchived: false
      }).lean();

      for (const session of abandonedSessions) {
        try {
          console.log(`[Call Cleanup Job] Cleaning up abandoned session ${session._id}`);
          
          await ActiveCallSession.updateOne(
            { _id: session._id },
            { 
              $set: {
                status: 'ended',
                endReason: 'abandoned',
                endTime: now,
                isArchived: true,
                lock: false
              }
            }
          );
          
          // Create history record
          await createCallHistoryRecord({ 
            ...session, 
            endTime: now,
            status: 'failed',
            endReason: 'participant_disconnected'
          });
          
          // Notify user
          if (io) {
            io.to(session.userId.toString()).emit("callAutoEnded", {
              sessionId: session._id,
              reason: "Connection timeout",
              message: "Call was automatically ended due to inactivity"
            });
          }
          
        } catch (error) {
          console.error(`[Call Cleanup Job] Error cleaning up session ${session._id}:`, error);
        }
      }
      
      console.log(`[Call Cleanup Job] Cleaned up ${abandonedSessions.length} abandoned sessions`);
      
    } catch (error) {
      console.error("[Call Cleanup Job] General error:", error);
    }
  });
};

module.exports = { 
  startCreditDeductionJob, 
  startFreeSessionTimerJob,
  startCallCleanupJob
};