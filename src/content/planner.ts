// ─────────────────────────────────────────────────────────────
// DATE-NIGHT PLANNER OPTIONS (all editable). After editing run `npm run seed`.
// No venues, prices or travel times are invented here: add real ones in the
// plan's "location" and "notes" fields, or reword the descriptions below.
// ─────────────────────────────────────────────────────────────
export type PlannerCategory = 'mood' | 'activity' | 'cuisine' | 'extra'

export interface PlannerOption {
  key: string
  category: PlannerCategory
  emoji: string
  label: string
  description: string
}

export const CATEGORY_TITLES: Record<PlannerCategory, { title: string; hint: string }> = {
  mood: { title: 'The mood', hint: 'How should tonight feel?' },
  activity: { title: 'What we do', hint: 'Heart the things you would love.' },
  cuisine: { title: 'What we eat', hint: 'Food we are both craving.' },
  extra: { title: 'Little extras', hint: 'The finishing touches.' },
}

export const PLANNER_OPTIONS: PlannerOption[] = [
  // moods
  { key: 'mood_cozy', category: 'mood', emoji: '🛋️', label: 'Cozy at home', description: 'Blankets, soft lights, no shoes.' },
  { key: 'mood_dressup', category: 'mood', emoji: '👗', label: 'Dress up and go out', description: 'Our nicest outfits, out in the world.' },
  { key: 'mood_romantic', category: 'mood', emoji: '🕯️', label: 'Romantic and quiet', description: 'Candles, slow music, close conversation.' },
  { key: 'mood_adventure', category: 'mood', emoji: '🧭', label: 'Adventure', description: 'Somewhere new, with no fixed plan.' },
  { key: 'mood_playful', category: 'mood', emoji: '🎈', label: 'Playful and spontaneous', description: 'We decide as we go and laugh a lot.' },
  // activities
  { key: 'act_cook', category: 'activity', emoji: '🍳', label: 'Cook together', description: 'One recipe, two chefs, mild chaos.' },
  { key: 'act_movie', category: 'activity', emoji: '🎬', label: 'Favourite food and a movie night', description: 'Order what we love and press play.' },
  { key: 'act_drive', category: 'activity', emoji: '🚗', label: 'Scenic drive', description: 'A good playlist and a nice view.' },
  { key: 'act_dessert', category: 'activity', emoji: '☕', label: 'Dessert or coffee out', description: 'Something sweet at a place we like.' },
  { key: 'act_games', category: 'activity', emoji: '🎲', label: 'Play games together', description: 'Cards, board games, or a friendly rivalry.' },
  { key: 'act_exchange', category: 'activity', emoji: '💌', label: 'Exchange letters or gifts', description: 'Read each other something written, or open a small gift.' },
  { key: 'act_questions', category: 'activity', emoji: '🃏', label: 'Question-card conversation', description: 'Draw cards (below) and answer honestly.' },
  { key: 'act_surprise', category: 'activity', emoji: '🎁', label: 'Choose a surprise activity', description: 'One of us plans it; the other finds out on the night.' },
  // cuisines (rename these to your real favourites)
  { key: 'food_italian', category: 'cuisine', emoji: '🍝', label: 'Italian', description: 'Pasta, pizza, tiramisu.' },
  { key: 'food_arabic', category: 'cuisine', emoji: '🥙', label: 'Arabic / Middle Eastern', description: 'Grills, mezze, warm bread.' },
  { key: 'food_asian', category: 'cuisine', emoji: '🍣', label: 'Asian / sushi', description: 'Sushi, noodles, dumplings.' },
  { key: 'food_comfort', category: 'cuisine', emoji: '🍔', label: 'Burgers and comfort food', description: 'Unapologetically cosy.' },
  { key: 'food_desi', category: 'cuisine', emoji: '🍛', label: 'Desi favourites', description: 'Rich, spicy and shared.' },
  { key: 'food_sweet', category: 'cuisine', emoji: '🧁', label: 'Only sweet things', description: 'Dessert for dinner, because why not.' },
  // extras
  { key: 'extra_playlist', category: 'extra', emoji: '🎶', label: 'Our playlist', description: 'Add a link to the music for the evening.' },
  { key: 'extra_photo', category: 'extra', emoji: '📸', label: 'A photo moment', description: 'One good photo of us, to keep.' },
  { key: 'extra_gifts', category: 'extra', emoji: '🎀', label: 'Gift exchange', description: 'Small gifts, big feelings.' },
  { key: 'extra_cards', category: 'extra', emoji: '💬', label: 'Conversation cards', description: 'A few good questions over dessert.' },
  { key: 'extra_finale', category: 'extra', emoji: '🌙', label: 'A surprise final activity', description: 'One last thing before the night ends.' },
]

export const optionByKey = (k: string) => PLANNER_OPTIONS.find((o) => o.key === k)

/** Cards for the "question-card conversation" (editable). */
export const CONVERSATION_CARDS: string[] = [
  'What is one moment from this past year that you would relive?',
  'What is something small I do that makes you feel loved?',
  'What are you most looking forward to in our second year?',
  'What is a dream you have not told me about yet?',
  'When did you feel closest to me this year?',
  'What is something new you would like us to try together?',
  'What is the best piece of advice you have ever been given?',
  'What do you hope we never stop doing?',
  'If we could spend a day anywhere together, where would we go?',
  'What would you like to thank me for?',
  'What is a tiny thing that always makes your day better?',
  'What is one thing we should do more often?',
]
