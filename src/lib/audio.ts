// Tiny synthesised sound design (Web Audio). No audio files, nothing starts without a user gesture.
import { getPrefs } from './prefs'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambientTimer: number | null = null

function ensure(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.5
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

function note(freq: number, start: number, dur: number, vol = 0.12, type: OscillatorType = 'sine') {
  const c = ensure(); if (!c || !master) return
  const o = c.createOscillator(); const g = c.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  o.connect(g); g.connect(master)
  o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05)
}

const on = () => getPrefs().sfx
export const sfx = {
  tap: () => on() && note(660, 0, 0.12, 0.05),
  tick: () => on() && note(1200, 0, 0.04, 0.04, 'triangle'),
  paper: () => {
    if (!on()) return
    const c = ensure(); if (!c || !master) return
    const buf = c.createBuffer(1, c.sampleRate * 0.18, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.25
    const s = c.createBufferSource(); s.buffer = buf
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400
    s.connect(f); f.connect(master); s.start()
  },
  chime: () => { if (!on()) return; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.09, 0.9, 0.09)) },
  wrong: () => { if (!on()) return; note(220, 0, 0.18, 0.07, 'triangle'); note(185, 0.12, 0.25, 0.07, 'triangle') },
  success: () => { if (!on()) return; [392, 523.25, 659.25, 783.99].forEach((f, i) => note(f, i * 0.1, 0.7, 0.1)) },
}

const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33]
export function startAmbient() {
  if (ambientTimer !== null || !ensure()) return
  const play = () => {
    const base = PENTA[Math.floor(Math.random() * PENTA.length)]
    note(base, 0, 3.2, 0.035)
    if (Math.random() > 0.5) note(base * 1.5, 0.6, 2.6, 0.02)
  }
  play()
  ambientTimer = window.setInterval(play, 2600)
}
export function stopAmbient() {
  if (ambientTimer !== null) { window.clearInterval(ambientTimer); ambientTimer = null }
}
