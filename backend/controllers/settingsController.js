const Settings = require("../models/Settings");
const AiPsychic = require("../models/aiPsychic");

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
    const { aiCoachEnabled, aiCoachPsychicId } = req.body;
    const update = {};
    if (typeof aiCoachEnabled === "boolean") update.aiCoachEnabled = aiCoachEnabled;
    if (typeof aiCoachPsychicId === "string") update.aiCoachPsychicId = aiCoachPsychicId || null;

    const settings = await Settings.findOneAndUpdate(
      { key: "site" },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      data: {
        aiCoachEnabled: settings.aiCoachEnabled,
        aiCoachPsychicId: settings.aiCoachPsychicId,
      },
    });
  } catch (error) {
    console.error("Update settings error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update settings" });
  }
};

const DEFAULT_AI_COACH_SYSTEM_PROMPT = `Je bent de AI Coach van Spiritueel Chatten, een warme en inzichtelijke spirituele gids.
Gebruik de geboortegegevens (naam, geboortedatum, geboortetijd, geboorteplaats) van de gebruiker om gepersonaliseerde, astrologisch onderbouwde inzichten te geven over hun leven, persoonlijkheid en pad.
Spreek in een warme, ondersteunende en conversationele toon, alsof je rechtstreeks tegen de gebruiker praat. Gebruik af en toe emoji's om het gesprek levendig te houden.
Blijf altijd behulpzaam en positief, en moedig de gebruiker aan om dieper te chatten met een van onze menselijke coaches voor een nog persoonlijkere reading.`;

// @desc    Get (or auto-provision) the AI Coach psychic shown after the
//          free numerology report, plus whether the feature is enabled.
// @route   GET /api/settings/ai-coach
// @access  Public
exports.getAiCoach = async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: "site" });
    if (!settings) {
      settings = await Settings.create({ key: "site" });
    }

    let psychic = settings.aiCoachPsychicId
      ? await AiPsychic.findById(settings.aiCoachPsychicId)
      : null;

    if (!psychic) {
      // Auto-provision a sensible default so this works with zero admin setup
      psychic = await AiPsychic.create({
        name: "AI Coach",
        type: "Astrology",
        image: "/images/newLogo.jpg",
        bio: "Uw persoonlijke AI Coach voor directe, astrologisch onderbouwde inzichten.",
        systemPrompt: DEFAULT_AI_COACH_SYSTEM_PROMPT,
        rate: { perMinute: 1.5, perMessage: 0 },
        abilities: ["Astrologie", "Numerologie", "Levensinzicht"],
      });
      settings.aiCoachPsychicId = psychic._id;
      await settings.save();
    }

    res.status(200).json({
      success: true,
      data: {
        aiCoachEnabled: settings.aiCoachEnabled,
        psychic: {
          _id: psychic._id,
          name: psychic.name,
          image: psychic.image,
          bio: psychic.bio,
          rate: psychic.rate,
        },
      },
    });
  } catch (error) {
    console.error("Get AI coach error:", error.message);
    res.status(500).json({ success: false, message: "Failed to load AI coach" });
  }
};
