/**
 * Writing prompts library for the Home Dashboard Writing Prompts widget.
 *
 * 60 prompts curated across five mental themes — reflection, gratitude, memory,
 * goals, struggles — but stored as a flat array per CONTEXT.md D-12. Theme
 * grouping is invisible to the user; daily selection is deterministic via
 * `getDayOfYear(new Date()) % PROMPTS.length` (D-13).
 *
 * Bump this file in a normal PR to expand the library. DASH-10 requires ≥ 60.
 */
export const PROMPTS: readonly string[] = [
  // --- Reflection (12) ---
  "What moment from today do you want to remember a year from now?",
  "What felt heavier than it needed to today?",
  "Describe a small decision you made today and what it reveals about you.",
  "What did you notice today that you usually miss?",
  "Where did your attention want to go but you didn't let it?",
  "What belief did today quietly test?",
  "If you could replay one minute of today, which minute and why?",
  "What did you say yes to that you almost said no to?",
  "What did you say no to that took courage?",
  "What question did you carry around today without answering?",
  "What did you learn about someone close to you today?",
  "What mood lived underneath your mood today?",

  // --- Gratitude (12) ---
  "Who made your day feel lighter, even a little?",
  "What in your home are you quietly grateful for right now?",
  "What did your body do for you today that you didn't thank it for?",
  "Which small comfort did you lean on today?",
  "What worked out that you had braced against?",
  "Who texted or called at exactly the right time?",
  "What part of this season are you going to miss when it's gone?",
  "What did past-you set up that present-you enjoyed today?",
  "What meal, drink, or taste is worth remembering from today?",
  "Name one thing that's better about your life than it was a year ago.",
  "Which of your routines is quietly saving you?",
  "What did a stranger do today that mattered?",

  // --- Memory (12) ---
  "Write about a smell that pulls you somewhere else.",
  "Describe the last time you laughed until your stomach hurt.",
  "What's a conversation you keep replaying in your head?",
  "Which childhood place would you most want to walk through tonight?",
  "Who would you call if landline long-distance still cost money?",
  "What's a meal you remember more clearly than the room you ate it in?",
  "Describe a song that used to mean one thing and now means another.",
  "What's the oldest piece of advice you still use?",
  "Who taught you something they didn't know they were teaching?",
  "What's a photo you've never taken but wish you had?",
  "Describe a time you felt exactly your age.",
  "Which birthday do you remember most vividly, and why?",

  // --- Goals (12) ---
  "What would you do this week if you trusted yourself more?",
  "What's the smallest version of a goal you've been avoiding?",
  "What did you used to want that you no longer want?",
  "If nothing changed for a year, what would you regret most?",
  "What skill are you one month of consistency away from?",
  "What's a dream you've outgrown but haven't officially released?",
  "Who are you becoming, and is that who you want to be?",
  "What would you build if you knew no one would judge the first version?",
  "What's the 80% version of a project you can ship this week?",
  "What deadline, self-imposed or not, is waiting for you?",
  "What habit, if you did it for 30 days, would most change your life?",
  "What's the bravest thing on your calendar this month?",

  // --- Struggles (12) ---
  "What are you pretending not to know?",
  "What's draining you that you haven't named yet?",
  "Where are you being kind at your own expense?",
  "What would you say if you weren't worried about how it would land?",
  "What relationship needs a conversation you've been postponing?",
  "What's the lie you tell yourself that has stopped working?",
  "What are you mourning that no one has acknowledged?",
  "Where are you stuck between two options and refusing to pick?",
  "What part of your life is running on fumes?",
  "What boundary do you wish you'd held today?",
  "What are you angry about that you haven't let yourself feel?",
  "What would 'enough' look like this week, specifically?",
] as const;

export default PROMPTS;
