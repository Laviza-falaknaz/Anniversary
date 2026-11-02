// Minimal HS256 session tokens built on Web Crypto (works in Deno and Node 20+).
const enc = new TextEncoder()
const dec = new TextDecoder()

export interface Claims {
  sub: 'guest'
  who?: 'laviza' | 'ahmed'
  iat: number // seconds
  exp: number // seconds
}

export function b64urlEncode(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (str.length % 4)) % 4)
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function key(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage])
}

export async function signToken(claims: Claims, secret: string): Promise<string> {
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const payload = b64urlEncode(enc.encode(JSON.stringify(claims)))
  const sig = await crypto.subtle.sign('HMAC', await key(secret, 'sign'), enc.encode(`${header}.${payload}`))
  return `${header}.${payload}.${b64urlEncode(new Uint8Array(sig))}`
}

/** Returns the claims if the signature is valid and the token has not expired; otherwise null. */
export async function verifyToken(token: string, secret: string, nowMs: number): Promise<Claims | null> {
  const parts = token.split('.')
  if (parts.length !== 3 || token.length > 2048) return null
  const [h, p, s] = parts
  try {
    const header = JSON.parse(dec.decode(b64urlDecode(h)))
    if (header.alg !== 'HS256') return null
    // crypto.subtle.verify compares in constant time
    const ok = await crypto.subtle.verify('HMAC', await key(secret, 'verify'), b64urlDecode(s), enc.encode(`${h}.${p}`))
    if (!ok) return null
    const claims = JSON.parse(dec.decode(b64urlDecode(p))) as Claims
    if (claims.sub !== 'guest' || typeof claims.exp !== 'number' || typeof claims.iat !== 'number') return null
    if (claims.exp * 1000 <= nowMs) return null
    if (claims.who !== undefined && claims.who !== 'laviza' && claims.who !== 'ahmed') return null
    return claims
  } catch {
    return null
  }
}

export async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)))
}

/** Constant-time comparison of two strings (compared as SHA-256 digests, so length does not leak). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)])
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

export async function hmacHex(secret: string, text: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await key(secret, 'sign'), enc.encode(text))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
