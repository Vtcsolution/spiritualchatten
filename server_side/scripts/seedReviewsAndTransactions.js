// scripts/seedReviewsAndTransactions.js
// Seeds the `Rating` and `Payment` collections so the admin dashboard's
// Reviews (/api/ratings/admin/all) and Transactions (/api/payments/admin/
// transactions) pages have data. Also refreshes each psychic's averageRating /
// totalRatings.
//
// Run from the server_side/ folder:
//   node scripts/seedReviewsAndTransactions.js
//   node scripts/seedReviewsAndTransactions.js --wipe   (delete ALL ratings + payments)
//
// Reviewer users use the @greatowear.review email domain and payments use the
// pi_gwseed_ id prefix, so re-running replaces only the seeded set.

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Psychic = require('../models/HumanChat/Psychic');
const Rating = require('../models/HumanChat/Rating');
const Payment = require('../models/Payment');

const MONGO_URL = process.env.DB_MONGODB_URL || process.env.MONGO_URI;
const REVIEW_DOMAIN = '@greatowear.review';
const PAY_PREFIX = 'pi_gwseed_';

const reviewers = [
  { firstName: 'Hannah',  lastName: 'Whitfield', username: 'hannah_w' },
  { firstName: 'Daniel',  lastName: 'Okonkwo',   username: 'daniel_ok' },
  { firstName: 'Sophie',  lastName: 'Bianchi',   username: 'sophie_b' },
  { firstName: 'Liam',    lastName: 'Novak',     username: 'liam_novak' },
  { firstName: 'Priya',   lastName: 'Deshmukh',  username: 'priya_d' },
  { firstName: 'Thomas',  lastName: 'Berger',    username: 'thomas_b' },
  { firstName: 'Elena',   lastName: 'Costa',     username: 'elena_c' },
  { firstName: 'Marcus',  lastName: 'Reyes',     username: 'marcus_r' },
  { firstName: 'Aisha',   lastName: 'Rahman',    username: 'aisha_r' },
  { firstName: 'Oliver',  lastName: 'Lindqvist', username: 'oliver_l' },
];

const comments = [
  'Incredibly accurate and kind. Left the session feeling clear and calm.',
  'She picked up on things I never mentioned. A little shaken, in a good way.',
  'Practical, honest advice. No sugar-coating and no fear-mongering.',
  'Warm, patient and very intuitive. Will definitely book again.',
  'Helped me make a decision I had been avoiding for months.',
  'Good reading overall. A couple of things did not land but the main message did.',
  'Fast responses and genuinely reassuring. Worth every credit.',
  'Deeply insightful. Felt like talking to someone who actually understood.',
  'The timing predictions were spot on. Came back to say thank you.',
  'Calm and grounded. Exactly what I needed after a rough week.',
  'Straight to the point and compassionate. Rare combination.',
  'Not what I wanted to hear, but exactly what I needed to hear.',
  '',
  'Very professional. Explained the cards clearly and answered every question.',
  'Reasonable and honest. Did not push me to keep the session going.',
];

const plans = [
  { name: 'Starter Pack',  amount: 5,   credits: 5,   bonus: 0 },
  { name: 'Popular Pack',  amount: 20,  credits: 20,  bonus: 2 },
  { name: 'Value Pack',    amount: 50,  credits: 50,  bonus: 8 },
  { name: 'Premium Pack',  amount: 100, credits: 100, bonus: 20 },
  { name: 'Custom Amount', amount: 15,  credits: 15,  bonus: 0 },
  { name: 'Custom Amount', amount: 35,  credits: 35,  bonus: 3 },
];
const methods = ['stripe', 'card', 'stripe_checkout'];
const statuses = ['paid', 'paid', 'paid', 'paid', 'failed', 'pending', 'canceled'];

const pick = (arr, i) => arr[i % arr.length];
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

(async () => {
  if (!MONGO_URL) {
    console.error('❌ No DB_MONGODB_URL / MONGO_URI in environment. Aborting.');
    process.exit(1);
  }
  const wipe = process.argv.includes('--wipe');
  await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 8000 });
  console.log(`✅ Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

  // ---- reviewer users ----
  const userIds = [];
  for (const r of reviewers) {
    const email = `${r.username}${REVIEW_DOMAIN}`.toLowerCase();
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({
        firstName: r.firstName,
        lastName: r.lastName,
        username: r.username,
        email,
        password: 'seedreviewuser',
        image: `https://randomuser.me/api/portraits/${['men', 'women'][userIds.length % 2]}/${20 + userIds.length}.jpg`,
      });
    }
    userIds.push(u._id);
  }
  // also let a few real users appear in transactions
  const realUsers = await User.find({ email: { $not: new RegExp(`${REVIEW_DOMAIN}$`) } }).select('_id').limit(5).lean();
  const payerIds = [...userIds, ...realUsers.map((u) => u._id)];
  console.log(`👤 ${reviewers.length} reviewer users ready, ${realUsers.length} real user(s) included in payments`);

  const psychics = await Psychic.find({}).select('_id name').lean();
  if (!psychics.length) {
    console.error('❌ No psychics found — run seedHumanPsychics.js first.');
    process.exit(1);
  }

  // ---- ratings ----
  if (wipe) {
    const { deletedCount } = await Rating.deleteMany({});
    console.log(`🧹 --wipe: removed ${deletedCount} rating(s)`);
  } else {
    const { deletedCount } = await Rating.deleteMany({ user: { $in: userIds } });
    console.log(`🧹 removed ${deletedCount} previous seeded rating(s)`);
  }

  let ratingsMade = 0;
  for (let ui = 0; ui < userIds.length; ui++) {
    // each reviewer rates 3 different psychics (unique user+psychic pairs)
    for (let k = 0; k < 3; k++) {
      const psy = psychics[(ui * 3 + k) % psychics.length];
      const stars = [5, 5, 4, 5, 4, 3, 5, 4][(ui + k) % 8];
      try {
        await Rating.create({
          user: userIds[ui],
          psychic: psy._id,
          rating: stars,
          comment: pick(comments, ui * 3 + k),
          isEdited: (ui + k) % 7 === 0,
          editedAt: (ui + k) % 7 === 0 ? daysAgo(ui + k) : undefined,
          createdAt: daysAgo(4 + (ui * 3 + k) * 4),
          updatedAt: daysAgo(4 + (ui * 3 + k) * 4),
        });
        ratingsMade++;
      } catch (e) {
        if (e.code !== 11000) console.warn(`  rating skip: ${e.message}`);
      }
    }
  }
  console.log(`⭐ created ${ratingsMade} ratings`);

  // refresh each psychic's aggregate rating
  const agg = await Rating.aggregate([
    { $group: { _id: '$psychic', avg: { $avg: '$rating' }, total: { $sum: 1 } } },
  ]);
  for (const a of agg) {
    await Psychic.updateOne(
      { _id: a._id },
      { $set: { averageRating: Math.round(a.avg * 10) / 10, totalRatings: a.total } }
    );
  }
  console.log(`🔄 refreshed averageRating/totalRatings on ${agg.length} psychic(s)`);

  // ---- payments / transactions ----
  if (wipe) {
    const { deletedCount } = await Payment.deleteMany({});
    console.log(`🧹 --wipe: removed ${deletedCount} payment(s)`);
  } else {
    const { deletedCount } = await Payment.deleteMany({ stripePaymentId: new RegExp(`^${PAY_PREFIX}`) });
    console.log(`🧹 removed ${deletedCount} previous seeded payment(s)`);
  }

  let paymentsMade = 0;
  let n = 0;
  for (let pi = 0; pi < payerIds.length; pi++) {
    const count = 2 + (pi % 3); // 2–4 payments each
    for (let k = 0; k < count; k++) {
      const plan = pick(plans, pi + k);
      const status = pick(statuses, n);
      const paid = status === 'paid';
      const created = daysAgo(2 + n * 3);
      try {
        await Payment.create({
          userId: payerIds[pi],
          amount: plan.amount,
          planName: plan.name,
          creditsPurchased: plan.credits,
          totalCredits: plan.credits + plan.bonus,
          bonusCredits: plan.bonus,
          paymentMethod: pick(methods, n),
          stripePaymentId: `${PAY_PREFIX}${created.getTime()}_${n}`,
          paymentIntentId: `pi_intent_gwseed_${n}`,
          status,
          creditsAdded: paid ? plan.credits + plan.bonus : 0,
          paidAt: paid ? created : undefined,
          errorMessage: status === 'failed' ? 'Card declined (test)' : undefined,
          createdAt: created,
          updatedAt: created,
        });
        paymentsMade++;
        n++;
      } catch (e) {
        if (e.code !== 11000) console.warn(`  payment skip: ${e.message}`);
        n++;
      }
    }
  }
  console.log(`💳 created ${paymentsMade} payments`);

  console.log(`\n✅ Done.`);
  console.log(`   Ratings total:  ${await Rating.countDocuments()}`);
  console.log(`   Payments total: ${await Payment.countDocuments()}`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
