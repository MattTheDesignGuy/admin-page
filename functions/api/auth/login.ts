import type { Env } from '../../lib/types'
import { verifyPassword } from '../../lib/password'
import { createSessionToken, sessionCookie } from '../../lib/session'
import { json, jsonError } from '../../lib/http'
import { checkLockout, clearAttempts, clientIp, recordFailedAttempt } from '../../lib/login-attempts'

interface LoginBody {
  username?: string
  password?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = clientIp(request)

  const lockedForMs = await checkLockout(env, ip)
  if (lockedForMs !== null) {
    const minutes = Math.ceil(lockedForMs / 60000)
    return jsonError(429, `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`)
  }

  let body: LoginBody
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'Invalid request body')
  }

  const { username, password } = body
  if (!username || !password) {
    return jsonError(400, 'Username and password are required')
  }

  const valid = username === env.ADMIN_USERNAME && (await verifyPassword(password, env.ADMIN_PASSWORD_HASH))
  if (!valid) {
    await recordFailedAttempt(env, ip)
    return jsonError(401, 'Invalid username or password')
  }

  await clearAttempts(env, ip)

  const token = await createSessionToken(env, username)
  const isSecure = new URL(request.url).protocol === 'https:'

  return json(
    { username },
    { headers: { 'Set-Cookie': sessionCookie(token, isSecure) } },
  )
}
