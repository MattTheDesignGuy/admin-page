import type { Env } from '../../lib/types'
import { clearSessionCookie } from '../../lib/session'
import { json } from '../../lib/http'

export const onRequestPost: PagesFunction<Env> = async () => {
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } })
}
