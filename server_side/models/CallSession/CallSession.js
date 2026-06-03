// models/CallSession/CallSession.js
const mongoose = require("mongoose");

const callSessionSchema = new mongoose.Schema({
  // Call identifier
  callSid: {
    type: String,
    unique: true,
    default: function() {
      return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  
  // Room name
  roomName: {
    type: String,
    required: true,
    sparse: true // NOT unique
  },
  
  // Twilio room SID
  roomSid: {
    type: String
  },
  
  // Participants
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  psychicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Psychic",
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: [
      'initiated', 'ringing', 'active', 'in-progress', 'completed', 
      'rejected', 'cancelled', 'missed', 'failed', 'pending'
    ],
    default: 'initiated'
  },
  
  endReason: {
    type: String,
    enum: [
      'completed_normally', 'ended_by_user', 'ended_by_psychic', 
      'insufficient_credits', 'participant_disconnected', 'call_timeout', 
      'psychic_busy', 'user_cancelled', 'technical_error', 'other'
    ]
  },
  
  // Timing
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  
  // Rate info
  ratePerMin: {
    type: Number,
    required: true
  },
  creditsPerMin: {
    type: Number,
    required: true
  },
  totalCreditsUsed: {
    type: Number,
    default: 0
  },
  
  // Tokens
  twilioToken: String,
  participantTokens: {
    user: String,
    psychic: String
  },
  
  // Recording
  recordingUrl: String,
  recordingSid: String,
  
  // Billing
  lastBilledAt: {
    type: Date
  },
  
  // Metadata
  errorMessage: String,
  userPlatform: String,
  psychicPlatform: String,
  
  // References
  callRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CallRequest"
  },
  activeSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ActiveCallSession"
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes
callSessionSchema.index({ userId: 1, createdAt: -1 });
callSessionSchema.index({ psychicId: 1, createdAt: -1 });
callSessionSchema.index({ status: 1 });
callSessionSchema.index({ roomName: 1 }, { sparse: true }); // Sparse index
callSessionSchema.index({ callSid: 1 });
callSessionSchema.index({ callRequestId: 1 });
callSessionSchema.index({ activeSessionId: 1 });

// Virtuals
callSessionSchema.virtual('formattedDuration').get(function() {
  if (!this.durationSeconds) return '0:00';
  const minutes = Math.floor(this.durationSeconds / 60);
  const seconds = this.durationSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

callSessionSchema.virtual('callCost').get(function() {
  return (this.durationSeconds / 60) * this.ratePerMin;
});

// Pre-save hook
callSessionSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.durationSeconds = Math.floor((this.endTime - this.startTime) / 1000);
  }
  this.updatedAt = new Date();
  next();
});

// Methods
callSessionSchema.methods.endCall = function(reason = 'ended_by_user') {
  this.status = 'completed';
  this.endReason = reason;
  this.endTime = new Date();
  if (this.startTime && this.endTime) {
    this.durationSeconds = Math.floor((this.endTime - this.startTime) / 1000);
  }
  return this.save();
};

module.exports = mongoose.model("CallSession", callSessionSchema);