import type { Env } from '../lib/types'
import { readSessionCookie, verifySessionToken } from '../lib/session'
import { jsonError } from '../lib/http'

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)

  if (url.pathname.startsWith('/api/auth/')) {
    return context.next()
  }

  const token = readSessionCookie(context.request)
  if (!token) {
    return jsonError(401, 'Not authenticated')
  }

  const session = await verifySessionToken(context.env, token)
  if (!session) {
    return jsonError(401, 'Session expired')
  }

  return context.next()
}
