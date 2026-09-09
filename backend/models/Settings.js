// models/Settings.js
// Singleton document holding site-wide toggles the admin can flip without a
// code deploy (e.g. showing/hiding the AI Coach feature on the public site).
const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "site" },
    aiCoachEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
