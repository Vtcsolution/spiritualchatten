const express = require("express");
const router = express.Router();
const { getPublicSettings, updateSettings, getAiCoach } = require("../controllers/settingsController");
const { adminProtect } = require("../middleware/adminProtect");

router.get("/", getPublicSettings);
router.get("/ai-coach", getAiCoach);
router.put("/", adminProtect, updateSettings);

module.exports = router;
