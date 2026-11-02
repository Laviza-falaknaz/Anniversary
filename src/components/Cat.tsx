// Original SVG illustration: a grey Scottish Fold, recognisable by small ears folded flat forward.
// Restyle by editing the colours below.
export type CatMood = 'idle' | 'oops' | 'happy'

const FUR = '#9ba1a9'
const FUR_DARK = '#79808a'
const FUR_LIGHT = '#c8cdd3'
const EYE = '#e8b43f'

export function Cat({ mood = 'idle', look = { x: 0, y: 0 }, className = '' }: { mood?: CatMood; look?: { x: number; y: number }; className?: string }) {
  const px = look.x * 5, py = look.y * 4
  const happy = mood === 'happy'
  const oops = mood === 'oops'
  return (
    <svg viewBox="0 0 320 300" className={className} role="img" aria-label="A grey Scottish Fold cat with small folded ears, peeking over the gate">
      <defs>
        <radialGradient id="catFur" cx="45%" cy="35%" r="75%"><stop offset="0" stopColor="#b3b8bf" /><stop offset="1" stopColor={FUR} /></radialGradient>
        <radialGradient id="catEye" cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#f6d070" /><stop offset="1" stopColor={EYE} /></radialGradient>
      </defs>

      {/* tail */}
      <g className="cat-tail"><path d="M236 262c46-6 62-52 34-78" fill="none" stroke={FUR_DARK} strokeWidth="22" strokeLinecap="round" /><path d="M236 262c46-6 62-52 34-78" fill="none" stroke={FUR} strokeWidth="16" strokeLinecap="round" /></g>

      {/* body */}
      <ellipse cx="160" cy="250" rx="98" ry="58" fill="url(#catFur)" />
      <ellipse cx="160" cy="262" rx="52" ry="40" fill={FUR_LIGHT} opacity=".7" />

      {/* head */}
      <ellipse cx="160" cy="132" rx="96" ry="84" fill="url(#catFur)" />

      {/* FOLDED EARS: small, rounded, bent forward and down against the skull */}
      <g>
        <path d="M82 84c-4-26 18-42 46-34 6 2 8 8 2 14-14 12-24 24-30 38-8 0-16-6-18-18z" fill={FUR_DARK} />
        <path d="M92 80c0-14 12-22 28-18-12 8-20 18-26 28z" fill={FUR} />
        <path d="M86 90c10-12 24-22 40-30" fill="none" stroke="#5f656e" strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
        <path d="M238 84c4-26-18-42-46-34-6 2-8 8-2 14 14 12 24 24 30 38 8 0 16-6 18-18z" fill={FUR_DARK} />
        <path d="M228 80c0-14-12-22-28-18 12 8 20 18 26 28z" fill={FUR} />
        <path d="M234 90c-10-12-24-22-40-30" fill="none" stroke="#5f656e" strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
      </g>

      {/* tabby forehead */}
      <g stroke={FUR_DARK} strokeWidth="4" strokeLinecap="round" fill="none" opacity=".75">
        <path d="M160 62v22" /><path d="M141 66c3 7 5 13 6 18" /><path d="M179 66c-3 7-5 13-6 18" />
      </g>

      {/* muzzle */}
      <ellipse cx="160" cy="170" rx="46" ry="30" fill={FUR_LIGHT} />
      <ellipse cx="128" cy="164" rx="22" ry="17" fill={FUR_LIGHT} />
      <ellipse cx="192" cy="164" rx="22" ry="17" fill={FUR_LIGHT} />

      {/* eyes */}
      {happy ? (
        <g stroke="#3a2a22" strokeWidth="5" strokeLinecap="round" fill="none"><path d="M106 134q20-20 40 0" /><path d="M174 134q20-20 40 0" /></g>
      ) : (
        <g>
          {[122, 198].map((cx) => (
            <g key={cx} className="cat-blink">
              <circle cx={cx} cy="128" r={oops ? 25 : 22} fill="url(#catEye)" stroke="#a97c1e" strokeWidth="2" />
              <ellipse cx={cx + px} cy={128 + py} rx={oops ? 8 : 5.2} ry={oops ? 17 : 15} fill="#1d1410" />
              <circle cx={cx + px - 5} cy={121 + py} r="4" fill="#fff" opacity=".95" />
            </g>
          ))}
        </g>
      )}

      {/* nose, mouth, whiskers */}
      <path d="M150 158h20l-10 11z" fill="#d98a86" />
      <path d="M160 169v7M160 176q-9 9-18 3M160 176q9 9 18 3" fill="none" stroke="#4a3126" strokeWidth="2.6" strokeLinecap="round" />
      <g stroke="#f4f1ec" strokeWidth="2" strokeLinecap="round" opacity=".9">
        <path d="M118 170L62 160M118 178L58 186M118 186L68 208" /><path d="M202 170L258 160M202 178L262 186M202 186L252 208" />
      </g>

      {/* paws holding a heart */}
      <ellipse cx="124" cy="286" rx="30" ry="18" fill={FUR_LIGHT} /><ellipse cx="196" cy="286" rx="30" ry="18" fill={FUR_LIGHT} />
    </svg>
  )
}
