import type { Env } from '../../lib/types'
import { clearSessionCookie } from '../../lib/session'
import { json } from '../../lib/http'

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  const isSecure = new URL(request.url).protocol === 'https:'
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie(isSecure) } })
}
