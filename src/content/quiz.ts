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
    question: 'PLACEHOLDER: Where did we first meet?',
    options: [{ key: 'a', text: '[[ADD: answer]]' }, { key: 'b', text: '[[ADD: wrong answer]]' }, { key: 'c', text: '[[ADD: wrong answer]]' }, { key: 'd', text: '[[ADD: funny wrong answer]]' }],
    correct: 'a',
    reveal: '[[ADD: a line about that day]]',
    placeholder: true,
  },
  {
    key: 'inside_joke',
    question: 'PLACEHOLDER: What is our favourite inside joke about?',
    options: [{ key: 'a', text: '[[ADD: answer]]' }, { key: 'b', text: '[[ADD: wrong answer]]' }, { key: 'c', text: '[[ADD: wrong answer]]' }, { key: 'd', text: '[[ADD: funny wrong answer]]' }],
    correct: 'a',
    reveal: '[[ADD: tell the story]]',
    placeholder: true,
  },
  {
    key: 'favourite_trip',
    question: 'PLACEHOLDER: Which place made it onto our "best memories" list?',
    options: [{ key: 'a', text: '[[ADD: answer]]' }, { key: 'b', text: '[[ADD: wrong answer]]' }, { key: 'c', text: '[[ADD: wrong answer]]' }, { key: 'd', text: '[[ADD: funny wrong answer]]' }],
    correct: 'a',
    reveal: '[[ADD: why it was special]]',
    placeholder: true,
  },
  {
    key: 'future',
    question: 'PLACEHOLDER: What is the first thing on our "someday" list?',
    options: [{ key: 'a', text: '[[ADD: answer]]' }, { key: 'b', text: '[[ADD: wrong answer]]' }, { key: 'c', text: '[[ADD: wrong answer]]' }, { key: 'd', text: '[[ADD: funny wrong answer]]' }],
    correct: 'a',
    reveal: '[[ADD: what you would like to do]]',
    placeholder: true,
  },
]
