import type { Env } from '../../lib/types'
import { json, jsonError } from '../../lib/http'
import { fetchHistoricalAudRate } from '../../lib/fx'

// Lets the frontend re-fetch a rate after the user edits the currency,
// date, or amount on an already-extracted expense (or when adding one
// manually with no receipt to extract from).
export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url)
  const currency = url.searchParams.get('currency')
  const date = url.searchParams.get('date')

  if (!currency) return jsonError(400, 'currency is required')
  if (!date) return jsonError(400, 'date is required')

  try {
    const fx = await fetchHistoricalAudRate(currency, date)
    return json({ fx })
  } catch (err) {
    return jsonError(502, err instanceof Error ? err.message : 'FX lookup failed')
  }
}
