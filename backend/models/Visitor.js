const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  sessionId: { type: String, required: true }, // Required for unique session tracking
  // YYYY-MM-DD (UTC) the visit falls on. Combined with sessionId via a
  // unique index below so the same session can only ever produce one
  // Visitor document per day, even if many requests race in at once on
  // first page load (the old find-then-create check wasn't atomic, so a
  // single visitor's first page load — which fires several parallel API
  // calls — could create many duplicate "visitor" rows).
  day: { type: String, required: true },
  browser: String,
  browserVersion: String,
  os: String,
  osVersion: String,
  device: String,
  ip: String,
  path: String,
  timestamp: { type: Date, default: Date.now },
});

visitorSchema.index({ sessionId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('Visitor', visitorSchema);