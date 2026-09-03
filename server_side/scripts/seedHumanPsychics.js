// scripts/seedHumanPsychics.js
// Seeds the `Psychic` collection (models/HumanChat/Psychic.js) with demo
// profiles across every category, using live remote portrait images.
//
// Run from the server_side/ folder:
//   node scripts/seedHumanPsychics.js            (adds/refreshes demo profiles)
//   node scripts/seedHumanPsychics.js --wipe     (delete ALL psychics first)
//
// Demo accounts use the @greatowear.demo email domain and password "Demo@1234".
// Re-running replaces the demo set only; real psychics are left untouched
// unless you pass --wipe.

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Psychic = require('../models/HumanChat/Psychic');

const MONGO_URL = process.env.DB_MONGODB_URL || process.env.MONGO_URI;
const DEMO_DOMAIN = '@greatowear.demo';
const DEMO_PASSWORD = 'Demo@1234';

// randomuser.me portraits are free, hot-linkable and CORS-friendly.
const womanImg = (n) => `https://randomuser.me/api/portraits/women/${n}.jpg`;
const manImg = (n) => `https://randomuser.me/api/portraits/men/${n}.jpg`;

// 2 profiles for each of the 9 categories defined in the Psychic model.
const profiles = [
  // ---- Tarot Reading ----
  {
    name: 'Selene Marchetti', gender: 'female', category: 'Tarot Reading',
    ratePerMin: 3.99, experience: 14, image: womanImg(44),
    location: 'Turin, Italy', languages: ['English', 'Italian'],
    specialization: 'Rider-Waite & Thoth tarot, timing spreads',
    abilities: ['Tarot Reading', 'Energy Reading', 'Past Life'],
    averageRating: 4.8, totalRatings: 212, status: 'online',
    bio: 'Third-generation tarot reader. I use the cards to give you clear, practical next steps rather than vague predictions. Direct, warm and completely non-judgmental.',
  },
  {
    name: 'Marcus Bright', gender: 'male', category: 'Tarot Reading',
    ratePerMin: 2.99, experience: 8, image: manImg(32),
    location: 'Austin, USA', languages: ['English'],
    specialization: 'Yes/No spreads, decision-making readings',
    abilities: ['Tarot Reading', 'Oracle Cards'],
    averageRating: 4.6, totalRatings: 97, status: 'away',
    bio: 'I keep readings grounded and honest. Bring one clear question and leave with a clear answer and the reasoning behind it.',
  },

  // ---- Astrology ----
  {
    name: 'Amara Okafor', gender: 'female', category: 'Astrology',
    ratePerMin: 4.49, experience: 18, image: womanImg(68),
    location: 'London, UK', languages: ['English', 'French'],
    specialization: 'Natal charts, transits, relationship synastry',
    abilities: ['Astrology', 'Numerology', 'Spiritual Guidance'],
    averageRating: 4.9, totalRatings: 341, status: 'online',
    bio: 'Professional astrologer for 18 years. I read your birth chart to explain the patterns you keep living out — and the timing of what is coming next.',
  },
  {
    name: 'Dmitri Volkov', gender: 'male', category: 'Astrology',
    ratePerMin: 3.5, experience: 22, image: manImg(51),
    location: 'Prague, Czechia', languages: ['English', 'Russian'],
    specialization: 'Predictive astrology, solar returns',
    abilities: ['Astrology', 'Horary'],
    averageRating: 4.7, totalRatings: 158, status: 'offline',
    bio: 'Traditional astrologer focused on forecasting. I will map the year ahead month by month so you can plan around the openings and the obstacles.',
  },

  // ---- Reading ----
  {
    name: 'Priya Nair', gender: 'female', category: 'Reading',
    ratePerMin: 2.49, experience: 6, image: womanImg(9),
    location: 'Kochi, India', languages: ['English', 'Hindi', 'Malayalam'],
    specialization: 'General life readings, energy check-ins',
    abilities: ['Energy Reading', 'Aura Reading'],
    averageRating: 4.5, totalRatings: 74, status: 'online',
    bio: 'A calm, intuitive reader for when you just need clarity on where things stand. No tools required — I tune into your energy and tell you what I sense.',
  },
  {
    name: 'Gabriel Santos', gender: 'male', category: 'Reading',
    ratePerMin: 3.25, experience: 11, image: manImg(64),
    location: 'Lisbon, Portugal', languages: ['English', 'Portuguese', 'Spanish'],
    specialization: 'Life-path readings, blockages',
    abilities: ['Energy Reading', 'Mediumship'],
    averageRating: 4.7, totalRatings: 129, status: 'away',
    bio: 'I help you understand the bigger picture of a situation and the one thing holding it back. Compassionate but straight to the point.',
  },

  // ---- Love & Relationships ----
  {
    name: 'Isabella Rossi', gender: 'female', category: 'Love & Relationships',
    ratePerMin: 4.99, experience: 16, image: womanImg(21),
    location: 'Naples, Italy', languages: ['English', 'Italian'],
    specialization: 'Soulmate connections, reconciliation, no-contact',
    abilities: ['Love Tarot', 'Energy Reading', 'Twin Flame'],
    averageRating: 4.9, totalRatings: 407, status: 'online',
    bio: 'Sixteen years guiding people through breakups, situationships and reconciliations. I will tell you how they feel and whether it is worth the wait.',
  },
  {
    name: 'Noah Fisher', gender: 'male', category: 'Love & Relationships',
    ratePerMin: 3.75, experience: 9, image: manImg(15),
    location: 'Melbourne, Australia', languages: ['English'],
    specialization: 'Communication issues, dating patterns',
    abilities: ['Love Tarot', 'Oracle Cards'],
    averageRating: 4.6, totalRatings: 143, status: 'offline',
    bio: 'Practical relationship guidance for people who want the truth, not comfort. We look at the pattern, the other person, and your next move.',
  },

  // ---- Career & Finance ----
  {
    name: 'Helena Bishop', gender: 'female', category: 'Career & Finance',
    ratePerMin: 4.25, experience: 13, image: womanImg(33),
    location: 'Toronto, Canada', languages: ['English'],
    specialization: 'Career changes, business timing, money blocks',
    abilities: ['Tarot Reading', 'Pendulum', 'Astrology'],
    averageRating: 4.8, totalRatings: 186, status: 'online',
    bio: 'Former recruiter turned intuitive advisor. I read on job offers, promotions, launches and investments — and the timing that makes them work.',
  },
  {
    name: 'Rajesh Kapoor', gender: 'male', category: 'Career & Finance',
    ratePerMin: 3.0, experience: 20, image: manImg(72),
    location: 'Singapore', languages: ['English', 'Hindi'],
    specialization: 'Business decisions, partnerships, abundance work',
    abilities: ['Numerology', 'Vedic Astrology'],
    averageRating: 4.7, totalRatings: 221, status: 'away',
    bio: 'Twenty years advising founders and professionals. Numbers and charts to pick the right timing for a move, a hire or a deal.',
  },

  // ---- Spiritual Guidance ----
  {
    name: 'Sister Maria Gomez', gender: 'female', category: 'Spiritual Guidance',
    ratePerMin: 2.75, experience: 25, image: womanImg(85),
    location: 'Seville, Spain', languages: ['English', 'Spanish'],
    specialization: 'Life purpose, grief, spiritual awakening',
    abilities: ['Prayer', 'Energy Healing', 'Mediumship'],
    averageRating: 4.9, totalRatings: 388, status: 'online',
    bio: 'A gentle guide through the hard seasons — loss, transition, awakening. Twenty-five years of listening and holding space.',
  },
  {
    name: 'Kai Anderson', gender: 'male', category: 'Spiritual Guidance',
    ratePerMin: 3.5, experience: 12, image: manImg(41),
    location: 'Reykjavik, Iceland', languages: ['English'],
    specialization: 'Shadow work, meditation, inner-child healing',
    abilities: ['Energy Healing', 'Chakra Balancing'],
    averageRating: 4.6, totalRatings: 112, status: 'offline',
    bio: 'I help you reconnect with yourself when life feels foggy. Expect calm questions, honest reflection and a practice to take away.',
  },

  // ---- Numerology ----
  {
    name: 'Delphine Laurent', gender: 'female', category: 'Numerology',
    ratePerMin: 3.25, experience: 15, image: womanImg(57),
    location: 'Lyon, France', languages: ['English', 'French'],
    specialization: 'Life-path & personal-year forecasts, name analysis',
    abilities: ['Numerology', 'Tarot Reading'],
    averageRating: 4.8, totalRatings: 174, status: 'online',
    bio: 'Your birth date and name hold a blueprint. I calculate it and translate it into what to focus on this year and next.',
  },
  {
    name: 'Elias Cohen', gender: 'male', category: 'Numerology',
    ratePerMin: 2.5, experience: 7, image: manImg(24),
    location: 'Tel Aviv, Israel', languages: ['English', 'Hebrew'],
    specialization: 'Compatibility numbers, business names',
    abilities: ['Numerology'],
    averageRating: 4.5, totalRatings: 63, status: 'away',
    bio: 'Fast, precise numerology for relationships and naming decisions. Bring the dates and names — I will do the math and the meaning.',
  },

  // ---- Clairvoyant ----
  {
    name: 'Ondine Beaumont', gender: 'female', category: 'Clairvoyant',
    ratePerMin: 5.49, experience: 19, image: womanImg(76),
    location: 'New Orleans, USA', languages: ['English', 'French'],
    specialization: 'Clear-seeing on people, places and outcomes',
    abilities: ['Clairvoyance', 'Mediumship', 'Psychometry'],
    averageRating: 4.9, totalRatings: 456, status: 'online',
    bio: 'I see images, faces and scenes around your situation and describe them to you exactly as they come. Bring a name or a photo in your mind.',
  },
  {
    name: 'Thomas Nguyen', gender: 'male', category: 'Clairvoyant',
    ratePerMin: 3.99, experience: 10, image: manImg(3),
    location: 'Vancouver, Canada', languages: ['English', 'Vietnamese'],
    specialization: 'Predictive clairvoyance, lost objects & people',
    abilities: ['Clairvoyance', 'Remote Viewing'],
    averageRating: 4.7, totalRatings: 138, status: 'offline',
    bio: 'Visual psychic. I get impressions of timelines and locations. Best for "what happens next" and "where is this heading" questions.',
  },

  // ---- Dream Analysis ----
  {
    name: 'Yasmin El-Sayed', gender: 'female', category: 'Dream Analysis',
    ratePerMin: 2.99, experience: 12, image: womanImg(12),
    location: 'Cairo, Egypt', languages: ['English', 'Arabic'],
    specialization: 'Recurring dreams, nightmares, symbolic messages',
    abilities: ['Dream Interpretation', 'Intuitive Counselling'],
    averageRating: 4.7, totalRatings: 121, status: 'online',
    bio: 'Tell me the dream in as much detail as you remember. I work through the symbols with you to find what your mind is trying to say.',
  },
  {
    name: 'Lars Eriksson', gender: 'male', category: 'Dream Analysis',
    ratePerMin: 3.25, experience: 9, image: manImg(48),
    location: 'Stockholm, Sweden', languages: ['English', 'Swedish'],
    specialization: 'Jungian dream work, lucid dreaming',
    abilities: ['Dream Interpretation', 'Shadow Work'],
    averageRating: 4.5, totalRatings: 58, status: 'away',
    bio: 'I combine Jungian symbolism with intuition to unpack what a dream is pointing at in your waking life, and what to do with it.',
  },
];

(async () => {
  if (!MONGO_URL) {
    console.error('❌ No DB_MONGODB_URL / MONGO_URI in environment. Aborting.');
    process.exit(1);
  }

  const wipe = process.argv.includes('--wipe');

  await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 8000 });
  console.log(`✅ Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

  if (wipe) {
    const { deletedCount } = await Psychic.deleteMany({});
    console.log(`🧹 --wipe: removed ${deletedCount} existing psychic(s)`);
  } else {
    const { deletedCount } = await Psychic.deleteMany({ email: { $regex: `${DEMO_DOMAIN}$` } });
    console.log(`🧹 removed ${deletedCount} previous demo psychic(s)`);
  }

  let created = 0;
  for (const p of profiles) {
    const email = p.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + DEMO_DOMAIN;
    const doc = new Psychic({
      ...p,
      email,
      password: DEMO_PASSWORD,
      isVerified: true,
      isActive: true,
      // Seeded psychics start OFFLINE and unavailable. Their real status is
      // only set to "online" when that psychic actually logs in and goes live;
      // the frontend enables Chat/Call solely for genuinely-online psychics.
      status: 'offline',
      availability: false,
      type: 'Human Psychic',
      totalRatings: p.totalRatings,
      averageRating: p.averageRating,
      lastSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
    await doc.save(); // triggers password-hashing pre-save hook
    created++;
    console.log(`  + ${p.category.padEnd(22)} ${p.name}`);
  }

  const total = await Psychic.countDocuments();
  console.log(`\n✅ Seeded ${created} psychics across ${new Set(profiles.map((p) => p.category)).size} categories.`);
  console.log(`📊 Psychic collection now holds ${total} document(s).`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
