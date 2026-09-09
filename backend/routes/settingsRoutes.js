const express = require("express");
const router = express.Router();
const { getPublicSettings, updateSettings } = require("../controllers/settingsController");
const { adminProtect } = require("../middleware/adminProtect");

router.get("/", getPublicSettings);
router.put("/", adminProtect, updateSettings);

module.exports = router;
