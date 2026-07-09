import type { Env } from './types'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
export const SESSION_COOKIE = 'tdg_session'

interface SessionPayload {
  u: string
  exp: number
}

export async function createSessionToken(env: Env, username: string): Promise<string> {
  const payload: SessionPayload = { u: username, exp: Date.now() + SESSION_TTL_MS }
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const signature = await sign(env.SESSION_SECRET, payloadB64)
  return `${payloadB64}.${signature}`
}

export async function verifySessionToken(env: Env, token: string): Promise<SessionPayload | null> {
  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return null

  const expectedSignature = await sign(env.SESSION_SECRET, payloadB64)
  if (!timingSafeEqual(signature, expectedSignature)) return null

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64))) as SessionPayload
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    if (typeof payload.u !== 'string') return null
    return payload
  } catch {
    return null
  }
}

export function sessionCookie(token: string, secure: boolean): string {
  const secureAttr = secure ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly${secureAttr}; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`
}

export function clearSessionCookie(secure: boolean): string {
  const secureAttr = secure ? '; Secure' : ''
  return `${SESSION_COOKIE}=; Path=/; HttpOnly${secureAttr}; SameSite=Strict; Max-Age=0`
}

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('Cookie')
  if (!header) return null
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  if (!match) return null
  return match.slice(SESSION_COOKIE.length + 1)
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return toBase64Url(new Uint8Array(signature))
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
