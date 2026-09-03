// scripts/seedBlogs.js
// Seeds the `Blog` collection with 2 articles for every category the Blog
// model allows (30 posts), each with a real Unsplash cover image, author,
// tags and HTML content.
//
// Run from the server_side/ folder:
//   node scripts/seedBlogs.js            (replace the seeded set only)
//   node scripts/seedBlogs.js --wipe     (delete ALL blogs first)
//
// Seeded posts carry the hidden marker "gwseed" in metaKeywords so re-running
// replaces only them and leaves hand-written blogs untouched.

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Blog = require('../models/blogModel');

const MONGO_URL = process.env.DB_MONGODB_URL || process.env.MONGO_URI;
const MARKER = 'gwseed';
const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

const authors = [
  { name: 'Amara Okafor',     image: 'https://randomuser.me/api/portraits/women/68.jpg', bio: 'Professional astrologer and spiritual writer with 18 years of practice.' },
  { name: 'Selene Marchetti', image: 'https://randomuser.me/api/portraits/women/44.jpg', bio: 'Third-generation tarot reader, teacher and author.' },
  { name: 'Kai Anderson',     image: 'https://randomuser.me/api/portraits/men/41.jpg',   bio: 'Meditation guide and shadow-work facilitator.' },
  { name: 'Isabella Rossi',   image: 'https://randomuser.me/api/portraits/women/21.jpg',  bio: 'Love and relationships intuitive and coach.' },
  { name: 'Marcus Bright',    image: 'https://randomuser.me/api/portraits/men/32.jpg',    bio: 'Practical tarot reader focused on clear, honest guidance.' },
];

// Small HTML body builder so every post has real structure.
const body = (intro, h1, p1, h2, p2, bullets) => `
<p>${intro}</p>
<h2>${h1}</h2>
<p>${p1}</p>
<h2>${h2}</h2>
<p>${p2}</p>
<ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
<p>Take what resonates, leave the rest, and return to this practice whenever you need to reconnect with yourself.</p>
`.trim();

// 2 posts per category. Category strings must match the Blog model enum exactly.
const posts = [
  // ---------------- Tarot ----------------
  {
    category: 'Tarot', img: 'photo-1601574465779-76d6dbb88557',
    title: 'How to Read a Three-Card Tarot Spread With Confidence',
    excerpt: 'The past–present–future spread is the fastest way to get a clear, useful reading. Here is a simple framework you can use tonight.',
    tags: ['tarot', 'beginner', 'spreads', 'divination'],
    content: body(
      'The three-card spread is where most readers start, and many never need anything more complex.',
      'The structure', 'Lay three cards left to right. Card one is the situation or recent past, card two is the heart of the matter right now, and card three is the likely direction if nothing changes.',
      'Reading the story', 'Resist interpreting each card in isolation. Look at how they talk to each other: a hopeful card followed by a heavy one tells a very different story than the reverse.',
      ['Shuffle while holding one clear question', 'Name each position out loud before you turn the card', 'Describe the image before you reach for the "meaning"', 'End by summarising the spread in one sentence']),
  },
  {
    category: 'Tarot', img: 'photo-1633158829585-23ba8f7c8caf',
    title: 'The Major Arcana as a Map of Personal Growth',
    excerpt: 'From The Fool to The World, the 22 Major Arcana cards trace a complete journey of becoming. Here is what each stage is really about.',
    tags: ['tarot', 'major arcana', 'psychology', 'self-development'],
    featured: true,
    content: body(
      'The Major Arcana is often described as "The Fool’s Journey" – a path from innocence to wholeness.',
      'The early cards', 'The Magician through The Chariot are about building a self: will, intuition, structure, love and drive. These are the tools you gather before life tests them.',
      'The turning point', 'The Wheel, Justice and The Hanged Man mark the moment control gives way to acceptance. Growth here is less about doing and more about seeing clearly.',
      ['The Fool: trust and the willingness to begin', 'Death: an ending that clears space', 'The Tower: a sudden, necessary collapse of what was false', 'The World: integration, completion, a new cycle ready to open']),
  },

  // ---------------- Astrology ----------------
  {
    category: 'Astrology', img: 'photo-1532012197267-da84d127e765',
    title: 'Your Rising Sign Explained: The Mask and the Doorway',
    excerpt: 'Your Sun sign is who you are becoming. Your Rising sign is how the world meets you first – and why first impressions of you can be so misleading.',
    tags: ['astrology', 'rising sign', 'birth chart', 'ascendant'],
    trending: true,
    content: body(
      'If people are often surprised once they get to know you, your Rising sign is probably doing a lot of work.',
      'What the Ascendant is', 'The Rising sign is the zodiac sign that was on the eastern horizon at the moment you were born. It sets the layout of your whole chart and colours your instinctive, in-the-room behaviour.',
      'Mask or doorway?', 'Early in life the Rising sign can feel like a mask you wear for safety. With maturity it becomes a doorway – the natural way your deeper self enters a situation.',
      ['Fire rising: quick, direct, warm energy on arrival', 'Earth rising: measured, grounded, slow to trust', 'Air rising: curious, verbal, socially fluent', 'Water rising: sensitive, guarded, reads the room instantly']),
  },
  {
    category: 'Astrology', img: 'photo-1419242902214-272b3f66ee7a',
    title: 'Mercury Retrograde: What It Actually Means (and Doesn’t)',
    excerpt: 'Three or four times a year Mercury appears to move backwards. Here is a grounded take on what to expect and how to work with it.',
    tags: ['astrology', 'mercury retrograde', 'transits', 'planning'],
    content: body(
      'Mercury retrograde has become shorthand for "everything is going wrong", which is neither fair nor useful.',
      'The mechanics', 'Mercury never truly reverses. From Earth it simply appears to slow, stop and backtrack for about three weeks. Astrologically, Mercury governs communication, travel, contracts and small daily logistics.',
      'How to use it', 'Treat it as a review period. It is a strong time to revise, reconnect and finish things, and a weaker time to sign, launch or buy expensive electronics without a backup plan.',
      ['Back up your files before it begins', 'Read contracts twice; expect slower replies', 'Reconnecting with old contacts often goes well', 'Build in extra time for journeys']),
  },

  // ---------------- Numerology ----------------
  {
    category: 'Numerology', img: 'photo-1454372182658-c712e4c5a1db',
    title: 'Find Your Life Path Number in Two Minutes',
    excerpt: 'Your Life Path number is the single most important figure in numerology. Here is exactly how to calculate it from your date of birth.',
    tags: ['numerology', 'life path', 'calculation', 'beginner'],
    content: body(
      'Everything in numerology starts with the Life Path number, drawn from your full date of birth.',
      'The method', 'Add every digit of your birth date together, then keep reducing until you reach a single digit – unless you land on 11, 22 or 33, which are kept as "master numbers".',
      'A worked example', 'For 14 June 1990: 1+4 = 5, June = 6, 1+9+9+0 = 19 → 1+9 = 10 → 1. Then 5 + 6 + 1 = 12 → 1+2 = 3. Life Path 3.',
      ['1: independence and initiative', '4: structure, patience, building', '5: freedom, change, experience', '7: analysis, depth, the search for truth', '9: compassion, completion, letting go']),
  },
  {
    category: 'Numerology', img: 'photo-1462759353907-b2ea5ebd72e7',
    title: 'Personal Year Numbers: Planning the Next 12 Months',
    excerpt: 'Numerology runs in nine-year cycles. Knowing which Personal Year you are in tells you whether to plant, tend or harvest.',
    tags: ['numerology', 'personal year', 'cycles', 'planning'],
    content: body(
      'A Personal Year number reframes the coming twelve months as one chapter in a nine-year story.',
      'How to find it', 'Add your birth day and birth month to the current year, then reduce to a single digit. The number changes each January.',
      'The arc of the cycle', 'Years 1–3 are for beginnings and growth, 4–6 for building and responsibility, and 7–9 for reflection, harvest and release before the next cycle opens.',
      ['Personal Year 1: start the thing you have been putting off', 'Personal Year 4: do the unglamorous foundational work', 'Personal Year 7: rest, study, go inward', 'Personal Year 9: finish, forgive, clear space']),
  },

  // ---------------- Palmistry ----------------
  {
    category: 'Palmistry', img: 'photo-1571844307880-751c6d86f3f3',
    title: 'The Three Major Lines of the Palm',
    excerpt: 'Heart, head and life lines carry the core of a palm reading. Here is what each one describes – and what it does not.',
    tags: ['palmistry', 'palm lines', 'hand reading', 'beginner'],
    content: body(
      'Most first palm readings focus on three lines that almost everyone has.',
      'What they cover', 'The heart line speaks to how you love and relate, the head line to how you think and make decisions, and the life line to vitality and major life changes – not, despite the myth, lifespan.',
      'Reading them well', 'Depth, length and clarity matter more than any single "meaning". A clean deep line suggests a steady flow of that energy; a broken or chained line suggests interruption and change.',
      ['A curved heart line: expressive, openly affectionate', 'A straight head line: logical, literal, focused', 'A life line close to the thumb: cautious with energy', 'Breaks and overlaps: transitions, not disasters']),
  },
  {
    category: 'Palmistry', img: 'photo-1518199266791-5375a83190b7',
    title: 'What the Mounts of the Palm Reveal About Temperament',
    excerpt: 'The raised pads beneath your fingers – the mounts – add personality and drive to the story the lines begin.',
    tags: ['palmistry', 'mounts', 'temperament', 'hand reading'],
    content: body(
      'If the lines are the plot of a palm reading, the mounts are the characters.',
      'The main mounts', 'Each mount is named after a classical planet and sits beneath a finger or along the edge of the hand: Jupiter for ambition, Saturn for discipline, Apollo for creativity, Mercury for communication.',
      'Full or flat', 'A well-developed mount suggests that quality is active and available to you; a flat mount suggests it is dormant or expressed through effort rather than instinct.',
      ['Full Mount of Venus: warmth, appetite for life, physical energy', 'Full Mount of the Moon: imagination, intuition, restlessness', 'Full Mount of Jupiter: leadership, confidence, appetite for more', 'Balanced mounts: an adaptable, even temperament']),
  },

  // ---------------- Love & Relationships ----------------
  {
    category: 'Love & Relationships', img: 'photo-1495571758719-6ec1e876d6ae',
    title: 'The Difference Between a Soulmate and a Life Partner',
    excerpt: 'Not every intense connection is meant to last, and not every lasting partnership feels like fireworks. Both are valuable.',
    tags: ['love', 'relationships', 'soulmate', 'connection'],
    featured: true,
    content: body(
      'People often arrive at a reading asking whether someone is "the one", when the more useful question is what this person is here to teach.',
      'Soulmate connections', 'These tend to be fast, magnetic and emotionally educational. They show you your patterns – sometimes gently, sometimes not – and they are not always meant to become permanent.',
      'Life partnership', 'A life partner is chosen daily. The bond is built from reliability, shared direction and the willingness to repair after conflict. It can absolutely include passion, but it does not depend on it.',
      ['Ask what you learn about yourself around this person', 'Notice whether the relationship gets calmer or more chaotic over time', 'Chemistry opens a door; character keeps it open', 'A hard connection is not the same as a wrong one']),
  },
  {
    category: 'Love & Relationships', img: 'photo-1502691876148-a84978e59af8',
    title: 'Reading the Cards on a Relationship Without Fooling Yourself',
    excerpt: 'It is hard to read tarot on your own love life. These guardrails keep the reading honest.',
    tags: ['love', 'tarot', 'relationships', 'self-reading'],
    content: body(
      'The cards will happily show you what you want to see if you let them.',
      'Set the question carefully', 'Avoid "will they come back". Ask instead: "What is the current state of this connection?" and "What is mine to work on here?" Open questions get honest answers.',
      'Watch your reactions', 'If you keep re-shuffling until you get a "good" card, stop. The first pull is usually the true one; the resistance is the reading.',
      ['One question, one spread, one time', 'Write the cards down before interpreting', 'Name the card you were hoping to avoid', 'Give it 24 hours before you act on anything']),
  },

  // ---------------- Career Guidance ----------------
  {
    category: 'Career Guidance', img: 'photo-1499209974431-9dddcece7f88',
    title: 'Using Tarot to Weigh a Job Offer',
    excerpt: 'A five-card spread that turns a stressful decision into a clear comparison of paths.',
    tags: ['career', 'tarot', 'decision-making', 'work'],
    content: body(
      'When two options both look reasonable on paper, a structured spread can surface what you already feel but have not admitted.',
      'The spread', 'Card 1: where you are now. Card 2: staying, best case. Card 3: staying, hidden cost. Card 4: leaving, best case. Card 5: leaving, hidden cost.',
      'How to decide', 'Compare the two "hidden cost" cards. The path whose downside you can genuinely live with is usually the right one.',
      ['Do the spread before you talk to anyone else', 'Read the hidden-cost cards first', 'Notice which "best case" you actually want', 'The cards inform the choice; they do not make it']),
  },
  {
    category: 'Career Guidance', img: 'photo-1517971129774-8a2b38fa128e',
    title: 'Astrology and Timing: When to Push and When to Wait',
    excerpt: 'Your chart will not tell you what job to take, but transits can tell you when doors are more likely to open.',
    tags: ['career', 'astrology', 'timing', 'transits'],
    content: body(
      'Timing is the part of career astrology that actually earns its keep.',
      'Growth windows', 'Supportive transits from Jupiter to your Midheaven or Sun often line up with visibility, offers and expansion. These are times to apply, pitch and ask.',
      'Consolidation windows', 'Saturn contacts ask for patience, proof and structure. Progress is real but slow, and shortcuts tend to collapse. Build now; launch later.',
      ['Track transits to your 10th house and its ruler', 'Jupiter years: say yes, be visible', 'Saturn years: get qualified, get organised', 'Eclipses near career points often force a decision']),
  },

  // ---------------- Spiritual Growth ----------------
  {
    category: 'Spiritual Growth', img: 'photo-1506126613408-eca07ce68773',
    title: 'Shadow Work: Meeting the Parts of Yourself You Avoid',
    excerpt: 'The traits you judge hardest in others are often a map to your own unlived life. Shadow work is how you reclaim them.',
    tags: ['spiritual growth', 'shadow work', 'psychology', 'healing'],
    featured: true,
    content: body(
      'Carl Jung called the shadow "the thing a person has no wish to be". Ignoring it does not remove it; it just hands it the steering wheel.',
      'How the shadow shows up', 'Disproportionate irritation, repeating relationship patterns, and qualities you insist you "would never" have are all classic signals.',
      'A gentle starting practice', 'When a strong judgement rises, pause and ask: "Where does this live in me, even a little?" You are not confessing to being that person – you are recovering a disowned strength.',
      ['Journal the traits that most annoy you in others', 'Look for the gift hidden inside each one', 'Do this work rested, not in crisis', 'Consider support – shadow work goes deep']),
  },
  {
    category: 'Spiritual Growth', img: 'photo-1489619243109-4e0ea59cfe10',
    title: 'Spiritual Bypassing: When "Good Vibes Only" Becomes a Problem',
    excerpt: 'Using spirituality to skip over grief, anger or accountability keeps you stuck. Real growth includes the hard feelings.',
    tags: ['spiritual growth', 'spiritual bypassing', 'emotions', 'integrity'],
    content: body(
      'Spiritual bypassing is the use of spiritual ideas to avoid facing unresolved emotional business.',
      'What it sounds like', '"Everything happens for a reason" said to someone still in shock. "I don’t do negativity." Rushing to forgive before you have let yourself be angry.',
      'The alternative', 'Let the feeling be fully felt first. Insight that arrives after the grief has moved through is durable; insight used to shut grief down is not.',
      ['Feel first, reframe later', 'Anger often carries information about a boundary', 'Forgiveness is a process, not a performance', 'Accountability is spiritual practice, not its opposite']),
  },

  // ---------------- Dream Interpretation ----------------
  {
    category: 'Dream Interpretation', img: 'photo-1490750967868-88aa4486c946',
    title: 'Keeping a Dream Journal That Actually Works',
    excerpt: 'Most dream meaning is personal, not universal. A good journal is how you learn your own symbol language.',
    tags: ['dreams', 'dream journal', 'symbols', 'practice'],
    content: body(
      'Dream dictionaries are a starting point at best. Your mind builds its own vocabulary.',
      'Capture technique', 'Write the moment you wake, before moving much. Record feeling first, then images, then events. Even three lines is enough.',
      'Finding patterns', 'After a few weeks, look back for recurring places, people and emotions. A house that keeps appearing is usually you; water is usually feeling; being unprepared is usually about visibility or judgement.',
      ['Keep the journal within arm’s reach of the bed', 'Note the dominant emotion in capitals', 'Give recurring symbols your own definitions', 'Review weekly, not nightly']),
  },
  {
    category: 'Dream Interpretation', img: 'photo-1483347756197-71ef80e95f73',
    title: 'Recurring Nightmares and What They Are Asking For',
    excerpt: 'A nightmare that repeats is rarely random. It is usually an unprocessed experience knocking on the door.',
    tags: ['dreams', 'nightmares', 'healing', 'trauma-informed'],
    content: body(
      'Recurring nightmares tend to fade once the waking situation they point to is acknowledged.',
      'Why they repeat', 'The dreaming mind replays what it has not been able to file. The repetition is not punishment; it is an unfinished task.',
      'Working with them safely', 'In daylight, and feeling steady, imagine the dream continuing past its worst moment to a resolution you choose. Rehearsing a new ending often changes the dream.',
      ['Look for the waking stressor the dream mirrors', 'Rescript the ending while awake and calm', 'Ground firmly before and after', 'If it is trauma-linked, work with a professional']),
  },

  // ---------------- Meditation & Mindfulness ----------------
  {
    category: 'Meditation & Mindfulness', img: 'photo-1476611317561-60117649dd94',
    title: 'A Five-Minute Practice for People Who "Can’t Meditate"',
    excerpt: 'You do not need to empty your mind. You need a small, repeatable anchor. Here is one.',
    tags: ['meditation', 'mindfulness', 'beginner', 'stress'],
    trending: true,
    content: body(
      'The belief that meditation means "no thoughts" stops more people than anything else. Thoughts are fine. Noticing them is the practice.',
      'The practice', 'Sit. Feel three slow breaths at the nose or belly. When you notice you have drifted – and you will – that noticing is a rep. Return to the breath. Repeat for five minutes.',
      'Why it works', 'You are training the return, not the staying. Every time you come back you strengthen the muscle that pulls attention out of spirals during the rest of the day.',
      ['Same time, same chair, every day', 'Count breaths 1–10, then restart', 'Drifting is not failing; returning is the point', 'Five honest minutes beats twenty resentful ones']),
  },
  {
    category: 'Meditation & Mindfulness', img: 'photo-1513346940221-6f673d962e97',
    title: 'Walking Meditation for a Busy Mind',
    excerpt: 'If sitting still makes you restless, movement can be the doorway in. Walking meditation is meditation with your eyes open.',
    tags: ['meditation', 'walking', 'mindfulness', 'nature'],
    content: body(
      'Some nervous systems settle through motion, not stillness. Walking meditation meets you there.',
      'How to do it', 'Choose a quiet stretch of 20–30 paces. Walk slower than normal. Feel the lift, swing and placement of each foot. At the end, pause, turn, and walk back.',
      'Working with distraction', 'When the mind wanders to your to-do list, note "thinking" and bring attention back to the soles of your feet. The feet are always in the present.',
      ['Keep the pace deliberately slow', 'Anchor on the contact of foot and ground', 'Short path, back and forth, so route decisions do not distract', 'Ten minutes is plenty to shift your state']),
  },

  // ---------------- Crystal Healing ----------------
  {
    category: 'Crystal Healing', img: 'photo-1518709594023-6eab9bab7b23',
    title: 'Five Crystals Worth Owning When You Are Starting Out',
    excerpt: 'You do not need a drawer full of stones. A small, intentional set will carry most of your practice.',
    tags: ['crystals', 'crystal healing', 'beginner', 'energy'],
    content: body(
      'A focused collection you actually use beats a large one you cannot keep track of.',
      'The core five', 'Clear quartz for clarity and amplification, rose quartz for self-compassion, amethyst for calm and sleep, black tourmaline for boundaries, and citrine for motivation.',
      'How to use them', 'Hold one during meditation, keep one on your desk, or place amethyst by the bed. The stone is a reminder and a focal point for your own intention.',
      ['Cleanse new stones under running water or moonlight', 'Set a clear intention when you first hold one', 'Keep black tourmaline near your entryway or workspace', 'Trust the stone you keep reaching for']),
  },
  {
    category: 'Crystal Healing', img: 'photo-1610375461246-83df859d849d',
    title: 'How to Cleanse and Charge Your Crystals',
    excerpt: 'Crystals pick up the energy of busy environments. A simple maintenance routine keeps them working for you.',
    tags: ['crystals', 'cleansing', 'charging', 'ritual'],
    content: body(
      'Think of cleansing as resetting a stone and charging as pointing it at a purpose.',
      'Cleansing options', 'Running water (avoid soft or porous stones), sound from a bell or bowl, smoke from herbs, or a few hours resting on a bed of dry salt or clear quartz.',
      'Charging', 'Leave stones out under the full moon, or hold each one and speak the intention you want it to hold. Re-charge whenever the stone feels "flat" to you.',
      ['Check hardness before using water – selenite and halite dissolve', 'Moonlight is safe for every stone', 'Cleanse after readings, arguments, or travel', 'A monthly reset is plenty for most people']),
  },

  // ---------------- Aura Reading ----------------
  {
    category: 'Aura Reading', img: 'photo-1502134249126-9f3755a50d78',
    title: 'Learning to Sense the Aura: A Beginner’s Exercise',
    excerpt: 'Before you see colours, you feel edges. Here is a simple partner exercise to develop the sensitivity.',
    tags: ['aura', 'energy', 'perception', 'practice'],
    content: body(
      'Aura perception usually begins as a physical sense – warmth, pressure, a "thickening" of the air – long before any imagery.',
      'The exercise', 'Rub your palms together for 20 seconds, then slowly draw them apart and back together. Most people feel a springy resistance between the hands within a minute. That is you sensing a field.',
      'Next step', 'With a willing partner, slowly move a hand toward their shoulder from a metre away, eyes closed, and stop when you feel a change. Compare notes. Accuracy improves quickly with practice.',
      ['Work when calm and unhurried', 'Trust the first, faint impression', 'Physical sensation comes before colour', 'Always ask consent before reading someone']),
  },
  {
    category: 'Aura Reading', img: 'photo-1534447677768-be436bb09401',
    title: 'What Aura Colours Are Commonly Said to Mean',
    excerpt: 'Colour associations vary between traditions, but a few themes come up again and again.',
    tags: ['aura', 'colours', 'energy', 'reference'],
    content: body(
      'Treat colour meanings as a shared starting vocabulary, not fixed law. Your own readings will refine them.',
      'Warm colours', 'Reds and oranges are usually linked to vitality, drive and physical energy; a muddy red can point to frustration or fatigue.',
      'Cool colours', 'Blues and greens are commonly tied to calm, communication and healing. Violet and white are associated with spiritual focus and, sometimes, with someone going through rapid change.',
      ['Bright, clear colour: that quality flowing freely', 'Dull or muddy colour: that quality blocked or strained', 'Colour near the head: mental and spiritual state', 'Colour near the body: physical and emotional state']),
  },

  // ---------------- Past Life Regression ----------------
  {
    category: 'Past Life Regression', img: 'photo-1447433589675-4aaa569f3e05',
    title: 'What Actually Happens in a Past Life Regression Session',
    excerpt: 'A first session can feel mysterious from the outside. Here is the structure most practitioners follow.',
    tags: ['past life', 'regression', 'hypnosis', 'what to expect'],
    content: body(
      'Whether you view past lives literally or as the mind’s symbolic storytelling, the process is the same and the insights can be real.',
      'The arc of a session', 'You are guided into deep relaxation, then invited to notice a scene – often starting with your feet, clothing or surroundings. The practitioner asks gentle questions and lets the story unfold.',
      'Afterwards', 'Good sessions end with time to connect the story to a current pattern: a fear, a relationship dynamic, a recurring theme. That link is where the value lives.',
      ['You stay aware and in control throughout', 'Impressions can be visual, emotional or "just known"', 'Nothing is forced – blank moments are fine', 'Bring one question or pattern you want light on']),
  },
  {
    category: 'Past Life Regression', img: 'photo-1489619243109-4e0ea59cfe10',
    title: 'Signs People Associate With Past Life Memories',
    excerpt: 'Unexplained affinities, fears and reactions are often where a regression practitioner starts looking.',
    tags: ['past life', 'memory', 'patterns', 'intuition'],
    content: body(
      'You do not need to believe in reincarnation to find these patterns worth exploring.',
      'Common threads', 'A strong pull toward a specific country or era, an intense fear with no origin story, meeting someone and feeling you already know them, or a skill that came far too easily.',
      'How to work with it', 'Note the pattern without forcing a narrative. In a session, that thread becomes the doorway; the "memory" that surfaces is less important than the release and understanding it brings.',
      ['Phobias with no known cause', 'Instant, disproportionate bonds or aversions', 'Recurring dreams set in another time', 'Talents that arrived almost fully formed']),
  },

  // ---------------- Chakra Healing ----------------
  {
    category: 'Chakra Healing', img: 'photo-1515894203077-9cd36032142f',
    title: 'The Seven Chakras, Explained Simply',
    excerpt: 'A quick, practical tour of the seven main energy centres and what each one governs in daily life.',
    tags: ['chakra', 'energy', 'beginner', 'reference'],
    featured: true,
    content: body(
      'The chakra system is a map of how energy and attention move through the body, from survival at the base to perspective at the crown.',
      'Lower three', 'Root (safety and belonging), Sacral (emotion, pleasure, creativity) and Solar Plexus (confidence, will and personal power).',
      'Upper four', 'Heart (love and connection), Throat (expression and truth), Third Eye (insight and imagination) and Crown (meaning and connection to something larger).',
      ['Root: "Am I safe?"', 'Heart: "Can I give and receive love?"', 'Throat: "Am I saying what is true?"', 'A "blocked" chakra usually points to a real-life question of the same theme']),
  },
  {
    category: 'Chakra Healing', img: 'photo-1533514114760-4389f572ae26',
    title: 'A Simple Chakra Check-In You Can Do Anywhere',
    excerpt: 'You do not need incense or an hour. A two-minute scan can tell you where your energy is stuck today.',
    tags: ['chakra', 'practice', 'self-care', 'grounding'],
    content: body(
      'Think of this as a weather report for your energy body.',
      'The scan', 'Close your eyes and bring attention to each centre in turn, base to crown. For each, ask: does this feel open, tight, or numb? Do not analyse – just register the first impression.',
      'What to do with it', 'Give the tightest centre five minutes of attention: hand on the area, slow breath into it, and one honest sentence about the life situation it relates to.',
      ['Base to crown, roughly ten seconds each', 'Note open / tight / numb, nothing more', 'Return to the one that stood out', 'Re-scan in a few days to see what shifted']),
  },

  // ---------------- Angel Numbers ----------------
  {
    category: 'Angel Numbers', img: 'photo-1507643179773-3e975d7ac515',
    title: 'Why You Keep Seeing 11:11 (and Other Repeating Numbers)',
    excerpt: 'Repeating numbers are less a cosmic message and more a nudge to pay attention to what you were just thinking.',
    tags: ['angel numbers', '1111', 'synchronicity', 'awareness'],
    trending: true,
    content: body(
      'Whether you read them as guidance from spirit or as your own pattern-spotting mind, repeating numbers are a useful prompt.',
      'The practical use', 'When you notice 11:11, 222 or 444, freeze the frame. What were you thinking or feeling one second earlier? That is the content the number is highlighting.',
      'Common associations', '111 – a new alignment forming; 222 – keep going, balance is being restored; 333 – support is present; 444 – you are on solid ground; 555 – change is moving.',
      ['Notice the thought that preceded the number', 'Keep a short log for two weeks', 'Look for clusters around specific decisions', 'Let it prompt reflection, not anxiety']),
  },
  {
    category: 'Angel Numbers', img: 'photo-1444703686981-a3abbc4d4fe3',
    title: 'Building Your Own Number Meanings',
    excerpt: 'The strongest angel-number practice is personal. Here is how to develop a system that actually fits your life.',
    tags: ['angel numbers', 'numerology', 'journaling', 'practice'],
    content: body(
      'Borrowed meanings are training wheels. Your own associations are the bike.',
      'The method', 'Each time a number repeats, log the date, the number, and what was happening. After a month, patterns emerge – maybe 717 always shows up before a good decision, or 000 before a rest is needed.',
      'Refining it', 'Cross-check with basic numerology (reduce the number to a single digit) but let your lived data win where they disagree.',
      ['Log context every single time', 'Reduce to a root digit for a second layer', 'Trust your data over any dictionary', 'Review monthly and rewrite your key']),
  },

  // ---------------- Psychic Development ----------------
  {
    category: 'Psychic Development', img: 'photo-1602052793312-b99c2a9ee797',
    title: 'The Four "Clairs" and How to Tell Which Is Yours',
    excerpt: 'Intuitive information arrives through different channels. Knowing your strongest one makes practice far easier.',
    tags: ['psychic development', 'clairvoyance', 'intuition', 'beginner'],
    featured: true,
    content: body(
      'Most people have one dominant intuitive channel and one or two supporting ones.',
      'The four channels', 'Clairvoyance is seeing (images, symbols, colours). Clairaudience is hearing (words, phrases, a song stuck on repeat). Clairsentience is feeling (body sensations, emotional read). Claircognizance is knowing (sudden certainty with no source).',
      'Finding yours', 'Recall the last time you "just knew" something. Did it come as a picture, a phrase, a gut feeling, or a flat fact? That is your primary clair, and where your practice will move fastest.',
      ['Visual thinker: likely clairvoyant', 'Talks things through: likely clairaudient', 'Reads rooms instantly: likely clairsentient', 'Knows without evidence: likely claircognizant']),
  },
  {
    category: 'Psychic Development', img: 'photo-1519810755548-39cd217da494',
    title: 'A Daily Practice to Strengthen Your Intuition',
    excerpt: 'Intuition behaves like a muscle. Small, consistent, low-stakes reps build it faster than occasional big tests.',
    tags: ['psychic development', 'intuition', 'daily practice', 'discipline'],
    content: body(
      'Trying to force a big psychic hit under pressure is the slowest way to develop. Little daily guesses are the fast way.',
      'The reps', 'Before you check your phone, guess how many notifications. Before a meeting, guess the mood in the room. Before the kettle boils, guess the time left. Then check.',
      'Why it works', 'You are learning the difference between a real impression and wishful thinking or fear – and you get instant, harmless feedback dozens of times a day.',
      ['Keep the stakes tiny', 'Always check the answer', 'Log hits and misses honestly', 'Notice the felt difference between "sensing" and "hoping"']),
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
    const { deletedCount } = await Blog.deleteMany({});
    console.log(`🧹 --wipe: removed ${deletedCount} existing blog(s)`);
  } else {
    const { deletedCount } = await Blog.deleteMany({ metaKeywords: new RegExp(MARKER) });
    console.log(`🧹 removed ${deletedCount} previous seeded blog(s)`);
  }

  let created = 0;
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const author = authors[i % authors.length];
    const daysAgo = 3 + i * 3; // spread posts across the last few months
    const wordish = p.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const readMin = Math.max(3, Math.round(wordish / 180) + 3);

    const doc = new Blog({
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      category: p.category,
      author: author.name,
      authorBio: author.bio,
      authorImage: author.image,
      image: IMG(p.img),
      images: [IMG(p.img)],
      tags: p.tags,
      readTime: `${readMin} min read`,
      date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      views: 120 + Math.floor(Math.random() * 900),
      likes: 8 + Math.floor(Math.random() * 60),
      featured: !!p.featured,
      trending: !!p.trending,
      isPublished: true,
      metaTitle: `${p.title} | Spiritueel Chatten`,
      metaDescription: p.excerpt,
      metaKeywords: `${p.tags.join(', ')}, ${MARKER}`,
    });

    await doc.save(); // triggers slug generation
    created++;
    console.log(`  + ${p.category.padEnd(24)} ${p.title}`);
  }

  const total = await Blog.countDocuments();
  console.log(`\n✅ Seeded ${created} blogs across ${new Set(posts.map((p) => p.category)).size} categories.`);
  console.log(`📊 Blog collection now holds ${total} document(s).`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
