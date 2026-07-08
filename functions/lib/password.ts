// Verifies passwords hashed by scripts/hash-password.mjs — same PBKDF2-SHA256
// scheme; keep both in sync if this changes.

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 4) return false
  const [scheme, iterationsStr, saltB64, hashB64] = parts
  if (scheme !== 'pbkdf2') return false

  const iterations = Number(iterationsStr)
  const salt = fromBase64(saltB64)
  const expected = fromBase64(hashB64)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  )

  return timingSafeEqual(new Uint8Array(bits), expected)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
