// ─────────────────────────────────────────────────────────────
// GIFT WHEEL REWARDS. Edit labels/descriptions/weights freely, then `npm run seed`.
// The server picks the winner (weighted random); the wheel only animates to it.
//
// kind:  'surprise' → a gift from the site, no strings
//        'wish'     → a wish card, granted when you both can
//        'mutual'   → an idea to enjoy together, only if you BOTH feel like it
// Nothing here is ever an obligation. Either of you can decline or swap, no penalty.
// ─────────────────────────────────────────────────────────────
export type RewardKind = 'surprise' | 'wish' | 'mutual'

export interface Reward {
  key: string
  emoji: string
  label: string
  description: string
  kind: RewardKind
  weight: number
  color: string // wheel slice
}

export const REWARDS: Reward[] = [
  { key: 'long_hug', emoji: '🤗', label: 'A long hug', description: 'The kind that lasts until you both start to smile. No rushing allowed.', kind: 'surprise', weight: 3, color: '#c98f7a' },
  { key: 'massage', emoji: '💆', label: 'A massage', description: 'Ten unhurried minutes of shoulders and tension-melting. Swap turns if you like.', kind: 'mutual', weight: 2, color: '#8c3b3f' },
  { key: 'kiss', emoji: '💋', label: 'A kiss', description: 'One proper kiss, delivered whenever the winner decides is the best moment.', kind: 'surprise', weight: 3, color: '#d9a7a0' },
  { key: 'date_choice', emoji: '🌹', label: 'Winner picks the date', description: 'The winner chooses our next date, and the other says yes with enthusiasm.', kind: 'wish', weight: 2, color: '#5a2a35' },
  { key: 'coffee_dessert', emoji: '🍰', label: 'Coffee or dessert, together', description: 'A sweet little stop together: your favourite coffee or something delicious to share.', kind: 'mutual', weight: 3, color: '#b9825a' },
  { key: 'surprise_treat', emoji: '🎁', label: 'A surprise treat', description: 'A small something, chosen with thought, to appear when the other least expects it.', kind: 'surprise', weight: 2, color: '#e0c28a' },
  { key: 'wish_card', emoji: '✨', label: 'A wish card', description: 'One reasonable wish, to be granted at a time that works for both of you.', kind: 'wish', weight: 2, color: '#a4543c' },
  { key: 'flirty_evening', emoji: '🕯️', label: 'A slow, flirty evening', description: 'Candles, slow music and a suggestion or two. Only if you both fancy it, and happily postponed if not.', kind: 'mutual', weight: 1, color: '#6f2f3a' },
  { key: 'mystery_bonus', emoji: '🎭', label: 'Mystery bonus', description: "Something Laviza hasn't told you about yet. Ask her to reveal it when you're ready.", kind: 'surprise', weight: 1, color: '#d6b98c' },
]

export const KIND_NOTE: Record<RewardKind, string> = {
  surprise: 'A surprise from us to you, with no strings attached.',
  wish: 'A wish: to be granted when you both can.',
  mutual: 'An idea to share, but only if you both feel like it.',
}
