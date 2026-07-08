import type { Env } from '../../lib/types'
import { verifyPassword } from '../../lib/password'
import { createSessionToken, sessionCookie } from '../../lib/session'
import { json, jsonError } from '../../lib/http'

interface LoginBody {
  username?: string
  password?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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

  if (username !== env.ADMIN_USERNAME) {
    return jsonError(401, 'Invalid username or password')
  }

  const valid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH)
  if (!valid) {
    return jsonError(401, 'Invalid username or password')
  }

  const token = await createSessionToken(env, username)

  return json(
    { username },
    { headers: { 'Set-Cookie': sessionCookie(token) } },
  )
}
