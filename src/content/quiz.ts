// ─────────────────────────────────────────────────────────────
// OUR LITTLE QUIZ. Edit the questions and answers.
// `placeholder: true` marks questions waiting for your real memories; they show a small
// badge while SITE.showPlaceholderBadges is true. Nothing here is a real fact about your
// relationship unless it came from the brief (names, date, the cat).
// ─────────────────────────────────────────────────────────────
export interface QuizQuestion {
  key: string
  question: string
  options: { key: string; text: string }[]
  correct: string // option key
  reveal: string // shown after answering
  placeholder?: boolean
}

export const QUIZ: QuizQuestion[] = [
  {
    key: 'date',
    question: 'What is the date of our first wedding anniversary?',
    options: [{ key: 'a', text: '2 November' }, { key: 'b', text: '14 February' }, { key: 'c', text: '31 December' }, { key: 'd', text: 'Every day, obviously' }],
    correct: 'a',
    reveal: 'Today! (Though "every day" gets a point for effort.)',
  },
  {
    key: 'cat_breed',
    question: 'What kind of cat rules our home?',
    options: [{ key: 'a', text: 'A grey Scottish Fold' }, { key: 'b', text: 'A fluffy Persian' }, { key: 'c', text: 'A sleek Siamese' }, { key: 'd', text: 'A tiny lion in disguise' }],
    correct: 'a',
    reveal: 'Folded ears, round face and total control of the household.',
  },
  {
    key: 'first_meet',
    question: 'Where did we first meet in person?',
    options: [{ key: 'a', text: 'Al Mamzar Beach' }, { key: 'b', text: 'Dubai Mall' }, { key: 'c', text: 'Jumeirah Beach' }, { key: 'd', text: 'In the queue for pizza' }],
    correct: 'a',
    reveal: 'Al Mamzar Beach, 17 October 2025. We had pizza and stayed together for eight hours.',
  },
  {
    key: 'inside_joke',
    question: 'What is our favourite inside joke about?',
    options: [{ key: 'a', text: 'Jalebi khaogy?' }, { key: 'b', text: 'Who hogs the blanket' }, { key: 'c', text: 'Which of us gets lost first' }, { key: 'd', text: 'Livikzi running the household' }],
    correct: 'a',
    reveal: 'Jalebi khaogy? Say no more.',
  },
  {
    key: 'favourite_trip',
    question: 'Which place made it onto our "best memories" list?',
    options: [{ key: 'a', text: 'Madinah' }, { key: 'b', text: 'Paris' }, { key: 'c', text: 'The Maldives' }, { key: 'd', text: 'A very comfortable sofa' }],
    correct: 'a',
    reveal: 'Madinah, from our first Umrah together.',
  },
  {
    key: 'future',
    question: 'What is the first thing on our "someday" list?',
    options: [{ key: 'a', text: 'Family' }, { key: 'b', text: 'A yacht' }, { key: 'c', text: 'Moving to Mars' }, { key: 'd', text: 'A bigger cat tree for Livikzi' }],
    correct: 'a',
    reveal: 'Family. Someday, and we cannot wait.',
  },
]
