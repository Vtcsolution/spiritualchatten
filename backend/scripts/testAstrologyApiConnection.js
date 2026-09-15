/**
 * Standalone verification script for the AI Coach <-> AstrologyAPI connection.
 *
 * Exercises the EXACT function chatController.js's live AI chat calls
 * (getWesternChartDataFromAstrologyAPI) — not a reimplementation — so a
 * pass here means the real chat pipeline will get real AstrologyAPI data,
 * not a reimplementation that could silently drift from production.
 *
 * Run on the server, from the backend/ directory, so it picks up the real
 * production .env and can reach the outside network:
 *
 *   cd /var/www/livecoach/backend
 *   node scripts/testAstrologyApiConnection.js
 *
 * Exits 0 on success, 1 on failure, and prints a clear PASS/FAIL summary
 * plus the actual data the AI Coach would receive.
 */

require("dotenv").config();
const { getCoordinatesFromCity } = require("../utils/geocode");
const { getWesternChartDataFromAstrologyAPI } = require("../controllers/chatController");

const TEST_INPUT = {
  yourName: "Test User",
  birthDate: "1990-06-15",
  birthTime: "10:00",
  birthPlace: "Amsterdam, Netherlands",
};

const line = (char = "-") => console.log(char.repeat(70));

async function main() {
  let failed = false;

  line("=");
  console.log("AI Coach <-> AstrologyAPI connection check");
  line("=");

  console.log(`\nEnv check:`);
  console.log(`  ASTROLOGY_API_USER_ID set: ${!!process.env.ASTROLOGY_API_USER_ID}`);
  console.log(`  ASTROLOGY_API_KEY set:     ${!!process.env.ASTROLOGY_API_KEY}`);
  if (!process.env.ASTROLOGY_API_USER_ID || !process.env.ASTROLOGY_API_KEY) {
    console.log("\n❌ FAIL: ASTROLOGY_API_USER_ID and/or ASTROLOGY_API_KEY are missing from .env");
    process.exit(1);
  }

  console.log(`\nTest birth data: ${JSON.stringify(TEST_INPUT)}`);

  console.log(`\nStep 1: Geocoding "${TEST_INPUT.birthPlace}"...`);
  let coords;
  try {
    coords = await getCoordinatesFromCity(TEST_INPUT.birthPlace);
    console.log(`  ✅ Coordinates: lat=${coords.latitude}, lon=${coords.longitude}`);
  } catch (err) {
    console.log(`  ❌ FAIL: Geocoding failed — ${err.message}`);
    process.exit(1);
  }

  console.log(`\nStep 2: Fetching birth chart from AstrologyAPI (planets/tropical + general_ascendant_report/tropical)...`);
  let western;
  try {
    western = await getWesternChartDataFromAstrologyAPI(TEST_INPUT, coords);
  } catch (err) {
    console.log(`  ❌ FAIL: AstrologyAPI call threw — ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    process.exit(1);
  }

  line();
  console.log("Result:");
  console.log(`  Source:        ${western.apiStatus.source} (chartSuccess: ${western.apiStatus.chartSuccess})`);
  console.log(`  Sun sign:      ${western.sunSign}`);
  console.log(`  Moon sign:     ${western.moonSign}`);
  console.log(`  Ascendant:     ${western.ascendant}`);
  console.log(`  Planets found: ${western.planets.length}`);
  western.planets.forEach((p) => {
    console.log(`    - ${p.name}: ${p.sign}, house ${p.house}`);
  });
  console.log(`  Explicit houses (sun/moon/venus/mars): ${JSON.stringify(western.explicitHouses)}`);
  line();

  if (western.apiStatus.source !== "AstrologyAPI") {
    console.log("\n❌ FAIL: Data did NOT come from AstrologyAPI (unexpected source).");
    failed = true;
  } else if (!western.apiStatus.chartSuccess || western.planets.length === 0) {
    console.log("\n❌ FAIL: AstrologyAPI responded but returned no usable planet data.");
    failed = true;
  } else if (western.sunSign === "Unknown" && western.moonSign === "Unknown") {
    console.log("\n❌ FAIL: AstrologyAPI responded but sun/moon signs are both Unknown — check the response shape.");
    failed = true;
  } else {
    console.log("\n✅ PASS: The AI Coach's birth-chart pipeline is genuinely using AstrologyAPI, with real data.");
  }

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("\n❌ FAIL: Unexpected error running the check:", err);
  process.exit(1);
});
