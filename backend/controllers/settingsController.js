const Settings = require("../models/Settings");

// Fetch (creating if needed) the single site settings document
async function getSettingsDoc() {
  let settings = await Settings.findOne({ key: "site" });
  if (!settings) {
    settings = await Settings.create({ key: "site" });
  }
  return settings;
}

// @desc    Get public site settings (feature toggles etc.)
// @route   GET /api/settings
// @access  Public
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await getSettingsDoc();
    res.status(200).json({
      success: true,
      data: {
        aiCoachEnabled: settings.aiCoachEnabled,
      },
    });
  } catch (error) {
    console.error("Get settings error:", error.message);
    // Fail open with the default so a settings-service hiccup never breaks the homepage
    res.status(200).json({ success: true, data: { aiCoachEnabled: true } });
  }
};

// @desc    Update site settings (admin only)
// @route   PUT /api/settings
// @access  Admin
exports.updateSettings = async (req, res) => {
  try {
    const { aiCoachEnabled } = req.body;
    const update = {};
    if (typeof aiCoachEnabled === "boolean") update.aiCoachEnabled = aiCoachEnabled;

    const settings = await Settings.findOneAndUpdate(
      { key: "site" },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      data: {
        aiCoachEnabled: settings.aiCoachEnabled,
      },
    });
  } catch (error) {
    console.error("Update settings error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update settings" });
  }
};
