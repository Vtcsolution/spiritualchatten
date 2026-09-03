const ChatRequest = require('../models/Paidtimer/ChatRequest');
const PaidTimer = require('../models/Paidtimer/PaidTimer');
const Wallet = require('../models/Wallet');
const Notification = require('../models/Paidtimer/Notification');
const mongoose = require('mongoose');

class TimerService {
  constructor() {
    this.activeTimers = new Map();
  }

  // Initialize timer service
  async initialize() {
    // Restore active timers from database on server start
    const activeRequests = await ChatRequest.find({
      'paidSession.isActive': true,
      'paidSession.isPaused': false
    });

    for (const request of activeRequests) {
      this.startTimerForRequest(request._id);
    }
  }

  // Start timer for a chat request
  async startTimerForRequest(chatRequestId) {
    if (this.activeTimers.has(chatRequestId)) {
      console.log(`Timer already running for request ${chatRequestId}`);
      return;
    }

    const intervalId = setInterval(async () => {
      await this.processSecond(chatRequestId);
    }, 1000);

    this.activeTimers.set(chatRequestId, intervalId);
    console.log(`Started timer for request ${chatRequestId}`);
  }

  // Process one second of timer.
  // Runs WITHOUT a MongoDB transaction so it works on standalone mongod
  // (transactions require a replica set). A per-second timer tick does not
  // need cross-document atomicity.
  async processSecond(chatRequestId) {
    try {
      const chatRequest = await ChatRequest.findById(chatRequestId);
      if (!chatRequest ||
          !chatRequest.paidSession ||
          !chatRequest.paidSession.isActive ||
          chatRequest.paidSession.isPaused ||
          chatRequest.paidSession.remainingSeconds <= 0) {
        this.stopTimer(chatRequestId);
        return;
      }

      const before = chatRequest.paidSession.remainingSeconds;
      chatRequest.paidSession.remainingSeconds = Math.max(0, before - 1);
      const after = chatRequest.paidSession.remainingSeconds;

      const paidTimer = await PaidTimer.findOne({ chatRequestId });
      if (paidTimer) {
        paidTimer.remainingSeconds = after;
        paidTimer.lastDeductionTime = new Date();
        await paidTimer.save();
      }

      // Minute boundary crossed -> deduct one minute's worth of credits
      if (Math.floor(before / 60) > Math.floor(after / 60)) {
        await this.deductMinute(chatRequest, null);
      }

      let expired = false;
      if (after <= 0) {
        await this.handleTimerExpiration(chatRequest, null);
        this.stopTimer(chatRequestId);
        expired = true;
      }

      await chatRequest.save();

      if (global.io) {
        const payload = {
          requestId: chatRequest._id,
          remainingSeconds: after,
          formattedTime: this.formatTime(after)
        };
        global.io.to(`user_${chatRequest.user}`).emit('timer_update', payload);
        global.io.to(`psychic_${chatRequest.psychic}`).emit('timer_update', payload);
        global.io.to(`chat_request_${chatRequest._id}`).emit('timer_update', payload);

        if (expired) {
          const endData = { requestId: chatRequest._id, reason: 'expired', remainingSeconds: 0 };
          global.io.to(`user_${chatRequest.user}`).emit('session_ended', endData);
          global.io.to(`psychic_${chatRequest.psychic}`).emit('session_ended', endData);
          global.io.to(`chat_request_${chatRequest._id}`).emit('session_ended', endData);
        }

        const wallet = await Wallet.findOne({ userId: chatRequest.user });
        if (wallet) {
          global.io.to(`user_${chatRequest.user}`).emit('wallet_balance_update', {
            requestId: chatRequest._id,
            balance: wallet.credits ?? wallet.credits,
            remainingMinutes: Math.floor((wallet.credits ?? wallet.credits) / (chatRequest.ratePerMin || 1))
          });
        }
      }
    } catch (error) {
      console.error('timer processSecond error:', error.message);
    }
  }

  // Deduct one minute's worth of balance - UPDATED
  async deductMinute(chatRequest, session) {
    try {
      const wallet = await Wallet.findOne({ userId: chatRequest.user }).session(session);
      if (!wallet) {
        console.error('Wallet not found for user:', chatRequest.user);
        return;
      }

      // Check if wallet is locked
      if (wallet.lock) {
        console.log('Wallet is locked, retrying in next interval...');
        return;
      }

      // Lock the wallet to prevent concurrent updates
      wallet.lock = true;
      await wallet.save({ session });

      // Deduct one minute's rate
      const amountToDeduct = chatRequest.ratePerMin;
      
      if (wallet.credits >= amountToDeduct) {
        // Perform deduction
        wallet.credits -= amountToDeduct;
        chatRequest.remainingBalance = wallet.credits;
        
        // Record deduction
        chatRequest.deductions.push({
          amount: amountToDeduct,
          timestamp: new Date(),
          secondsUsed: 60,
          remainingBalance: wallet.credits
        });

        chatRequest.totalAmountPaid = (chatRequest.totalAmountPaid || 0) + amountToDeduct;

        // Save wallet and chat request
        await wallet.save({ session });
        await chatRequest.save({ session });

        // Create payment notification
        const notification = new Notification({
          recipient: chatRequest.user,
          recipientModel: 'User',
          sender: chatRequest.psychic,
          senderModel: 'Psychic',
          type: 'payment_deducted',
          title: 'Payment Deducted',
          message: `${amountToDeduct} credits deducted for chat session`,
          data: {
            chatRequestId: chatRequest._id,
            amount: amountToDeduct,
            remainingBalance: wallet.credits,
            remainingMinutes: Math.floor(wallet.credits / chatRequest.ratePerMin)
          },
          chatRequestId: chatRequest._id
        });

        await notification.save({ session });

        // Emit balance update
        if (global.io) {
          global.io.to(`user_${chatRequest.user}`).emit('balance_updated', {
            requestId: chatRequest._id,
            newBalance: wallet.credits,
            deductedAmount: amountToDeduct,
            remainingSeconds: chatRequest.paidSession.remainingSeconds
          });

          // Also emit wallet update for header
          global.io.to(`user_${chatRequest.user}`).emit('wallet_update', {
            balance: wallet.credits,
            credits: wallet.credits || wallet.credits // Use balance as credits if credits not set
          });
        }

        // Check for low balance
        if (wallet.credits < chatRequest.ratePerMin) {
          const remainingMinutes = Math.floor(wallet.credits / chatRequest.ratePerMin);
          const lowBalanceNotification = new Notification({
            recipient: chatRequest.user,
            recipientModel: 'User',
            sender: chatRequest.psychic,
            senderModel: 'Psychic',
            type: 'balance_low',
            title: 'Low Balance Warning',
            message: `Only ${remainingMinutes} minute(s) remaining`,
            data: {
              chatRequestId: chatRequest._id,
              remainingBalance: wallet.credits,
              remainingMinutes: remainingMinutes
            },
            chatRequestId: chatRequest._id
          });

          await lowBalanceNotification.save({ session });

          if (global.io) {
            global.io.to(`user_${chatRequest.user}`).emit('balance_low', {
              requestId: chatRequest._id,
              message: `Low balance: ${remainingMinutes} minute(s) remaining`,
              remainingBalance: wallet.credits
            });
          }
        }
      } else {
        console.log('Insufficient balance for deduction:', {
          userId: chatRequest.user,
          currentBalance: wallet.credits,
          required: amountToDeduct
        });
        
        // Stop timer if insufficient balance
        this.stopTimer(chatRequest._id);
        
        // Update chat request status
        chatRequest.status = 'completed';
        chatRequest.endedAt = new Date();
        chatRequest.paidSession.isActive = false;
        chatRequest.paidSession.endTime = new Date();
        await chatRequest.save({ session });

        // Emit insufficient balance event
        if (global.io) {
          global.io.to(`user_${chatRequest.user}`).emit('insufficient_balance', {
            requestId: chatRequest._id,
            message: 'Insufficient balance to continue session'
          });
          
          global.io.to(`psychic_${chatRequest.psychic}`).emit('session_ended', {
            requestId: chatRequest._id,
            reason: 'insufficient_balance'
          });
        }
      }

      // Unlock wallet
      wallet.lock = false;
      await wallet.save({ session });

    } catch (error) {
      console.error('Deduction error:', error);
      
      // Try to unlock wallet if error occurred
      try {
        const wallet = await Wallet.findOne({ userId: chatRequest.user }).session(session);
        if (wallet && wallet.lock) {
          wallet.lock = false;
          await wallet.save({ session });
        }
      } catch (unlockError) {
        console.error('Failed to unlock wallet after error:', unlockError);
      }
    }
  }

  // Handle timer expiration
  async handleTimerExpiration(chatRequest, session) {
    chatRequest.status = 'completed';
    chatRequest.endedAt = new Date();
    chatRequest.paidSession.isActive = false;
    chatRequest.paidSession.endTime = new Date();

    // Update paid timer
    const paidTimer = await PaidTimer.findOne({ chatRequestId: chatRequest._id }).session(session);
    if (paidTimer) {
      paidTimer.status = 'expired';
      paidTimer.endTime = new Date();
      await paidTimer.save({ session });
    }

    // Create expiration notifications
    const userNotification = new Notification({
      recipient: chatRequest.user,
      recipientModel: 'User',
      sender: chatRequest.psychic,
      senderModel: 'Psychic',
      type: 'session_ended',
      title: 'Session Expired',
      message: 'Your paid session has expired',
      data: {
        chatRequestId: chatRequest._id,
        totalAmountPaid: chatRequest.totalAmountPaid
      },
      chatRequestId: chatRequest._id
    });

    const psychicNotification = new Notification({
      recipient: chatRequest.psychic,
      recipientModel: 'Psychic',
      sender: chatRequest.user,
      senderModel: 'User',
      type: 'session_ended',
      title: 'Session Expired',
      message: 'Paid session has expired',
      data: {
        chatRequestId: chatRequest._id,
        totalAmountPaid: chatRequest.totalAmountPaid
      },
      chatRequestId: chatRequest._id
    });

    await Promise.all([
      userNotification.save({ session }),
      psychicNotification.save({ session })
    ]);

    // Emit expiration events
    if (global.io) {
      global.io.to(`user_${chatRequest.user}`).emit('session_expired', {
        requestId: chatRequest._id
      });

      global.io.to(`psychic_${chatRequest.psychic}`).emit('session_expired', {
        requestId: chatRequest._id
      });

      // Emit final wallet update
      const wallet = await Wallet.findOne({ userId: chatRequest.user }).session(session);
      if (wallet) {
        global.io.to(`user_${chatRequest.user}`).emit('wallet_update', {
          balance: wallet.credits,
          credits: wallet.credits || wallet.credits
        });
      }
    }
  }

  // Stop timer
  stopTimer(chatRequestId) {
    if (this.activeTimers.has(chatRequestId)) {
      clearInterval(this.activeTimers.get(chatRequestId));
      this.activeTimers.delete(chatRequestId);
      console.log(`Stopped timer for request ${chatRequestId}`);
    }
  }

  // Pause timer
  pauseTimer(chatRequestId) {
    this.stopTimer(chatRequestId);
  }

  // Resume timer
  async resumeTimer(chatRequestId) {
    const chatRequest = await ChatRequest.findById(chatRequestId);
    if (chatRequest && 
        chatRequest.paidSession.isActive && 
        !chatRequest.paidSession.isPaused &&
        chatRequest.paidSession.remainingSeconds > 0) {
      this.startTimerForRequest(chatRequestId);
    }
  }

  // Format time as MM:SS
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

module.exports = new TimerService();