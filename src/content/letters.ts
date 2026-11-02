// ─────────────────────────────────────────────────────────────
// THE LOVE LETTERS (Laviza → Ahmed).
//
// IMPORTANT: this file is intentionally NOT imported by the website. Letters are loaded
// into the database by `npm run seed` and the server only releases a letter's text once
// its unlock time has passed, so nobody can read ahead in the page source.
//
// Placeholders look like [[ADD: ...]] and are highlighted on the page so they are easy to
// spot. Replace each one with something real (a memory, an inside joke…), then re-run
// `npm run seed` and execute supabase/seed.sql. Nothing here claims a real memory.
// ─────────────────────────────────────────────────────────────
export interface Letter {
  slug: string
  purpose: string // the emotional job of the letter (shown in the archive)
  teaser: string // all anyone sees before the letter unlocks
  title: string
  body: string
}

export const LETTERS: Letter[] = [
  {
    slug: 'welcome',
    purpose: 'Welcome',
    teaser: 'Where our day begins',
    title: 'Happy First Anniversary, Ahmed',
    body: `Good morning, husband.

I wanted today to feel like opening a present slowly, so I built you a little world. Every few hours a new letter will unlock, there are games to play, a wheel to spin, and a plan for tonight that we get to make together.

One whole year of being married to you. I'm not sure I have the words for what that feels like, but I'm going to spend the day trying.

Take your time with this. Read the letters when they appear, tap the little hearts, and leave me notes whenever you like. I'll be peeking at everything you do, just so you know.

Happy anniversary, my love. Let's begin.

Yours,
Laviza`,
  },
  {
    slug: 'gratitude',
    purpose: 'Gratitude',
    teaser: 'A thank-you, properly said',
    title: 'Thank you for being mine',
    body: `Ahmed,

I don't say thank you to you enough. Not the quick kind you say over your shoulder, but the real kind.

Thank you for choosing me, and for choosing me again on the ordinary days when nobody is watching and there is no occasion to mark. Marriage is mostly made of those days, and I'm so glad mine are with you.

Thank you for the patience you've had with me this year, for the times you listened properly, and for the times you didn't fix anything and just stayed close.

[[ADD: one specific thing he did this year that you are grateful for]]

I hope you know that I notice. I notice all of it.

Love,
Laviza`,
  },
  {
    slug: 'quality',
    purpose: 'What I love about you',
    teaser: 'A quality I never get tired of',
    title: 'The thing I love most about you',
    body: `Dear Ahmed,

People often ask what you love most about the person you married, and I never have just one answer. But today I want to tell you about one thing.

It's the way you are when you are really being yourself, when you're not performing or being polite. That version of you is warm, steady, and very easy to love.

[[ADD: the quality you love most in him, and a small moment that shows it]]

Being around that version of you makes me feel safe and a little braver. You probably don't know you do that. Now you do.

Always yours,
Laviza`,
  },
  {
    slug: 'everyday',
    purpose: 'Everyday closeness',
    teaser: 'Small moments, big feelings',
    title: 'Ordinary days, my favourite days',
    body: `Hi love,

I've been thinking about how much of our life together is made of small things: the sound of you coming home, sharing the couch, a shared look across a room when something is funny and nobody else gets it.

[[ADD: one tiny everyday ritual that belongs only to the two of you]]

Nobody puts these moments in photo albums, but they are the moments I would miss the most. When I picture our home, I don't picture the big days. I picture you in it, being you.

Thank you for making the ordinary feel like something worth keeping.

Love,
Laviza`,
  },
  {
    slug: 'memory',
    purpose: 'Playful memory',
    teaser: 'A game of remember-when',
    title: 'Remember when…',
    body: `Ahmed,

Time for a game. I'll start, then it's your turn.

My memory: [[ADD: a favourite memory from your first year together, a trip, a funny moment, an inside joke]]

Your turn! Press "Reply" on this letter and tell me your favourite moment from our first year. It can be big or tiny or ridiculous. The more specific, the better.

I'll know if you pick the boring answer.

xx
Laviza`,
  },
  {
    slug: 'flirty',
    purpose: 'Teasing and flirting',
    teaser: 'A small warning',
    title: 'A small warning',
    body: `Husband,

Fair warning: I've been thinking about you all day, and it's been very distracting.

I've reread your name in my phone more than once. I've caught myself smiling at nothing. I'm a grown woman with responsibilities, and you are ruining my productivity.

I also know exactly what I like about the way you look in that shirt, so let's not pretend this is innocent.

Anyway. Just wanted you to know that after a whole year, you still have an effect on me. Do with that information what you will.

Behave. Or don't.

Laviza 😉`,
  },
  {
    slug: 'effort',
    purpose: 'Appreciation for effort',
    teaser: 'For everything you do quietly',
    title: 'I see you',
    body: `Ahmed,

You work hard. You carry things most people never see, and you do it without making a big deal of it.

I want you to know I see it: the effort you put into our life, the way you show up even when you're tired, and all the small, unglamorous things you do for us.

[[ADD: a specific thing he does for the household, for you, or for his work that deserves recognition]]

You don't have to be perfect for me to be proud of you. I'm proud of you already. Today, tomorrow, and on the tired days too.

Thank you for being here, truly here.

With love,
Laviza`,
  },
  {
    slug: 'reassurance',
    purpose: 'Reassurance',
    teaser: 'For whenever you need it',
    title: 'Whenever you doubt',
    body: `My love,

Some days you may feel like you're not enough, or that you've let someone down, or that you're falling behind where you wanted to be.

I'd like to say something to that voice: it is wrong about you.

You are loved. Not for what you achieve or fix or provide, but because you are you. I chose you, and I would choose you again.

When things feel heavy, come find me. We don't have to solve anything straight away. We can sit together, and I'll remind you of who you are until you believe it.

I'm on your side. Always.

Laviza`,
  },
  {
    slug: 'future',
    purpose: 'Our future',
    teaser: 'A peek at year two',
    title: 'Year two and beyond',
    body: `Dear Ahmed,

I've started daydreaming about what's next for us.

I picture us still laughing at the same silly things. I picture more adventures and quieter evenings, and a home that feels more like ours every year.

[[ADD: one or two real hopes: a place you want to visit, something you want to build or try together]]

I don't know exactly what the future holds, but I know who I want next to me in it. I'd like to keep growing together, to keep being curious about each other, and to keep choosing each other deliberately.

Here's to year two. I can't wait.

Yours always,
Laviza`,
  },
  {
    slug: 'tonight',
    purpose: 'Time together',
    teaser: 'About tonight',
    title: 'Save tonight for me',
    body: `Ahmed,

Tonight, I'd like all of you.

No phones, no work, no half-attention. Just the two of us, doing something we choose together.

I haven't decided anything on my own, because I'd like us to plan it as a team. Open the "Tonight" page, tell me what you're in the mood for, and see what we both like. Pick a time, and let's make it a real plan.

I'll be happy with anything, as long as it's with you.

See you soon,
Laviza`,
  },
  {
    slug: 'cheeky',
    purpose: 'Cheeky and intimate',
    teaser: 'Maybe read this one in private',
    title: 'Not for reading aloud',
    body: `Husband,

I'm going to be a little bold, so make sure no one is reading over your shoulder.

A year in, I still love the way you look at me when you think I'm not paying attention. I'm always paying attention.

Tonight, I'd like you to take your time. I'm in no hurry and I plan to enjoy every minute of it. Think slow music, dim lights, and a wife who has been thinking about you since breakfast.

No pressure, only possibilities. We'll follow each other's lead, and it only happens if we both feel like it. That's the best part of being married to you: I never have to wonder.

Consider this your invitation. I'll leave the rest to your imagination.

Yours,
Laviza 🔥`,
  },
  {
    slug: 'final',
    purpose: 'Final heartfelt letter',
    teaser: 'The last letter of the day',
    title: 'One year, and all my love',
    body: `My Ahmed,

This is the last letter of the day, and I find I still have more to say than I have room for.

One year ago we made a promise, and every day since I've understood it a little better. Marriage isn't one big moment. It's choosing each other over and over, in kindness and in silliness, in plans and in change.

[[ADD: a closing memory or a promise you want to renew]]

Thank you for this year: for the laughter, for the care, for being my person. I love you more than I know how to write, and I'm looking forward to every year still ahead of us.

Happy first anniversary, my love.

Forever yours,
Laviza`,
  },
]
