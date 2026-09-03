// scripts/seedAdmin.js
// Creates (or resets the password of) an admin account in the `admins`
// collection so you can log in at /admin/login.
//
// Run from the server_side/ folder:
//   node scripts/seedAdmin.js
//   node scripts/seedAdmin.js someone@example.com SomePassword   (custom)
//
// The password is hashed by the Admin model's pre-save hook.

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/adminModel');

const MONGO_URL = process.env.DB_MONGODB_URL || process.env.MONGO_URI;

const email = (process.argv[2] || 'admin@gmail.com').toLowerCase().trim();
const password = process.argv[3] || 'Admin123';
const name = process.argv[4] || 'Administrator';

(async () => {
  if (!MONGO_URL) {
    console.error('❌ No DB_MONGODB_URL / MONGO_URI in environment. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 8000 });
  console.log(`✅ Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

  let admin = await Admin.findOne({ email });

  if (admin) {
    admin.password = password; // pre-save hook re-hashes it
    admin.name = admin.name || name;
    await admin.save();
    console.log(`♻️  Existing admin found — password reset.`);
  } else {
    admin = new Admin({ email, password, name, role: 'admin' });
    await admin.save();
    console.log(`✨ New admin created.`);
  }

  const count = await Admin.countDocuments();
  console.log('\n─────────────────────────────');
  console.log(`  Admin login`);
  console.log(`  URL:      /admin/login`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Name:     ${admin.name}`);
  console.log(`  Role:     ${admin.role}`);
  console.log(`─────────────────────────────`);
  console.log(`Total admins in DB: ${count}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
