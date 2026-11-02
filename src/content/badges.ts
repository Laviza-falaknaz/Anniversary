// Achievement badges. Keys must match the server (see the check constraint in the schema).
export interface Badge { key: string; emoji: string; title: string; description: string }

export const BADGES: Badge[] = [
  { key: 'first_letter', emoji: '💌', title: 'First letter', description: 'You opened your very first letter.' },
  { key: 'reader', emoji: '📖', title: 'Reader', description: 'Three letters opened.' },
  { key: 'devoted_reader', emoji: '🕯️', title: 'Devoted reader', description: 'Six letters opened.' },
  { key: 'note_exchange', emoji: '🪶', title: 'Notes exchanged', description: 'You have both left a note or reply.' },
  { key: 'quiz_done', emoji: '🧩', title: 'Quiz complete', description: 'You finished our little quiz.' },
  { key: 'gift_revealed', emoji: '🎁', title: 'Gift revealed', description: 'You spun the wheel.' },
  { key: 'wish_maker', emoji: '🌠', title: 'Wish maker', description: 'You added a wish to the jar.' },
  { key: 'plan_confirmed', emoji: '🥂', title: "Tonight's plan", description: 'You both confirmed the plan for tonight.' },
]
