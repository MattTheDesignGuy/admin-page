import type { Env } from '../../lib/types'
import { json } from '../../lib/http'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT id, business_name, attention, address_lines FROM clients ORDER BY business_name',
  ).all()
  return json({ clients: results })
}
