// ─────────────────────────────────────────────────────────────
// BONUS CONTENT: "Open when…" envelopes and the "Choose your surprise" adventure.
// This text ships in the public page (it is not time-locked), so keep it playful, not secret.
// ─────────────────────────────────────────────────────────────
export interface OpenWhen {
  key: string
  title: string
  message: string
}

export const OPEN_WHEN: OpenWhen[] = [
  { key: 'miss', title: 'Open when you miss me', message: "I'm closer than it feels. Close your eyes, take a slow breath, and picture me rolling my eyes at you with a smile. Now go find your phone and tell me you miss me. I'll answer fast." },
  { key: 'reassurance', title: 'Open when you need reassurance', message: "You are doing better than you think. You are loved on your worst days and your best ones, and nothing about that is up for debate. Take a breath. I've got you." },
  { key: 'laugh', title: 'Open when you want to laugh', message: "Quick: think of something ridiculous we've done together. Got it? Good. Now picture me doing that again, in slow motion, with dramatic music. You're welcome." },
  { key: 'kiss', title: 'Open when you want a kiss', message: "Consider this a coupon. Valid anywhere I am, any time you ask, with no expiry date. Show it to me in person for immediate redemption. 💋" },
  { key: 'remember', title: 'Open when you want to remember us', message: 'Open Memory Lane, scroll slowly, and let yourself smile. We started with a promise and every day since has been us keeping it. Go and add one more memory to the list.' },
  { key: 'encouragement', title: 'Open when you need a little encouragement', message: "You've been brave before and you'll be brave again. I believe in you more than I believe in most things. Go and do the thing, and then tell me all about it." },
]

export interface AdventureNode {
  id: string
  text: string
  choices?: { label: string; next: string }[]
  /** present on final nodes */
  ending?: { title: string; message: string; idea: string }
}

export const ADVENTURE_START = 'start'
export const ADVENTURE: AdventureNode[] = [
  {
    id: 'start',
    text: 'You are standing in a quiet hallway in our little world. Three doors glow softly. Which one do you try?',
    choices: [
      { label: 'The velvet door, with candlelight underneath', next: 'velvet' },
      { label: 'The door that smells like coffee and cake', next: 'cafe' },
      { label: 'The door with a ribbon tied around the handle', next: 'ribbon' },
    ],
  },
  {
    id: 'velvet',
    text: 'Inside: a record player, two glasses, and a room that seems built for slow evenings. The music starts by itself.',
    choices: [
      { label: 'Ask me to dance', next: 'end_dance' },
      { label: 'Sit down and talk until the candles burn low', next: 'end_talk' },
    ],
  },
  {
    id: 'cafe',
    text: 'A tiny table for two, a menu with only sweet things, and a window that looks out on the evening.',
    choices: [
      { label: 'Order everything sweet', next: 'end_dessert' },
      { label: 'Take the long way home together', next: 'end_drive' },
    ],
  },
  {
    id: 'ribbon',
    text: 'Behind the ribbon is a small box with a note that says "not yet". Your fingers itch to open it.',
    choices: [
      { label: 'Pull the ribbon right now', next: 'end_mystery' },
      { label: 'Wait, and let tonight build the suspense', next: 'end_wait' },
    ],
  },
  { id: 'end_dance', text: '', ending: { title: 'One slow dance', message: 'No steps required. Just my hand in yours and the kitchen floor as a ballroom.', idea: 'Put on one song that is ours and dance to the end of it.' } },
  { id: 'end_talk', text: '', ending: { title: 'The long conversation', message: 'No phones, no clocks. Just the two of us finding out something new about each other.', idea: 'Take turns asking questions until one of us runs out.' } },
  { id: 'end_dessert', text: '', ending: { title: 'Sweet tooth, activated', message: 'Dessert first, dinner optional. You choose the first flavour and I choose the second.', idea: 'Go out for dessert, or bring the dessert home and eat it from one plate.' } },
  { id: 'end_drive', text: '', ending: { title: 'The scenic route', message: 'We are in no hurry. Good music, a quiet road, and your hand somewhere near mine.', idea: 'Go for a drive with no destination and one shared playlist.' } },
  { id: 'end_mystery', text: '', ending: { title: 'The impatient one', message: 'Inside the box is a small dare: do something spontaneous together, something neither of us planned.', idea: "Pick a random thing you'd both enjoy and do it within the hour." } },
  { id: 'end_wait', text: '', ending: { title: 'Worth the wait', message: 'Patience, my love. The best surprises are tonight, and they are better with anticipation.', idea: 'Write the surprise on a slip of paper and open it together later this evening.' } },
]
