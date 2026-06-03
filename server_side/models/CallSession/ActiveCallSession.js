// models/CallSession/ActiveCallSession.js
const mongoose = require("mongoose");

const activeCallSessionSchema = new mongoose.Schema({
  // Basic info
  roomName: { 
    type: String, 
    required: true, // Change to true
    default: function() {
      return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  
  // Call identifier
  callIdentifier: {
    type: String,
    unique: true
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
  
  // Call status
  status: {
    type: String,
    enum: [
      'initiated',    // Call initiated, waiting for psychic
      'ringing',      // Psychic notified
      'in-progress',  // Call active
      'ended',        // Call ended
      'failed',       // Call failed
      'rejected'      // Psychic rejected
    ],
    default: 'initiated'
  },
  
  // Timing
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  
  // Credit tracking
  creditsPerMin: {
    type: Number,
    default: 1 // 1 credit per minute for audio calls
  },
  lastDeductedMinute: {
    type: Number,
    default: 0
  },
  totalCreditsUsed: {
    type: Number,
    default: 0
  },
  
  // Free session tracking
  isFreeSession: {
    type: Boolean,
    default: false
  },
  freeSessionUsed: {
    type: Boolean,
    default: false
  },
  freeEndTime: {
    type: Date
  },
  remainingFreeTime: {
    type: Number,
    default: 0
  },
  
  // Twilio info
  twilioRoomSid: String,
  participantTokens: {
    user: String,
    psychic: String
  },
  recordingUrl: String,
  
  // Job processing
  lock: {
    type: Boolean,
    default: false
  },
  lastProcessed: {
    type: Date
  },
  lastChargeTime: {
    type: Date
  },
  
  // Metadata
  endReason: String,
  errorMessage: String,
  isArchived: {
    type: Boolean,
    default: false
  },
  
  // User platform info
  userPlatform: String,
  psychicPlatform: String,
  
  // Reference to CallRequest
  callRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CallRequest"
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

// Indexes for performance
activeCallSessionSchema.index({ userId: 1, status: 1 });
activeCallSessionSchema.index({ psychicId: 1, status: 1 });
activeCallSessionSchema.index({ roomName: 1 });
activeCallSessionSchema.index({ callIdentifier: 1 }, { unique: true });
activeCallSessionSchema.index({ callRequestId: 1 });
activeCallSessionSchema.index({ lock: 1, isArchived: 1 });
activeCallSessionSchema.index({ status: 1, lastProcessed: 1 });

// Update timestamp before save
activeCallSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("ActiveCallSession", activeCallSessionSchema);