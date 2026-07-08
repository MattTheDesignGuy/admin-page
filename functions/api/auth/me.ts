import type { Env } from '../../lib/types'
import { readSessionCookie, verifySessionToken } from '../../lib/session'
import { json, jsonError } from '../../lib/http'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = readSessionCookie(request)
  if (!token) return jsonError(401, 'Not authenticated')

  const session = await verifySessionToken(env, token)
  if (!session) return jsonError(401, 'Session expired')

  return json({ username: session.u })
}
