import type { Env } from './types'

const MAX_ATTEMPTS = 3
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown'
}

/** Returns ms until the lockout clears, or null if the IP isn't locked out. */
export async function checkLockout(env: Env, ip: string): Promise<number | null> {
  const cutoff = new Date(Date.now() - WINDOW_MS).toISOString()
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ? AND created_at < ?').bind(ip, cutoff).run()

  const { results } = await env.DB.prepare('SELECT created_at FROM login_attempts WHERE ip = ? ORDER BY created_at ASC')
    .bind(ip)
    .all<{ created_at: string }>()

  if (results.length < MAX_ATTEMPTS) return null

  const oldest = new Date(results[0].created_at).getTime()
  const clearsAt = oldest + WINDOW_MS
  return Math.max(0, clearsAt - Date.now())
}

export async function recordFailedAttempt(env: Env, ip: string): Promise<void> {
  await env.DB.prepare('INSERT INTO login_attempts (id, ip, created_at) VALUES (?, ?, ?)')
    .bind(crypto.randomUUID(), ip, new Date().toISOString())
    .run()
}

export async function clearAttempts(env: Env, ip: string): Promise<void> {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run()
}
