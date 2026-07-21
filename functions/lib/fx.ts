export interface FxRate {
  currency: string
  rate: number
  /**
   * The date the rate actually applies to. Frankfurter only publishes
   * ECB business-day rates, so a weekend/holiday date snaps back to the
   * nearest earlier rate — this is that resolved date, not necessarily
   * the date requested.
   */
  rateDate: string
}

/**
 * Historical foreign-currency -> AUD rate for a given date, sourced from
 * ECB reference rates via the free Frankfurter API (frankfurter.dev). This
 * is a "reasonable market rate" for ATO foreign-income/expense translation
 * purposes — it doesn't have to be the RBA rate unless you've formally
 * elected to use RBA rates for everything.
 */
export async function fetchHistoricalAudRate(currency: string, date: string): Promise<FxRate> {
  const code = currency.trim().toUpperCase()
  if (code === 'AUD') return { currency: code, rate: 1, rateDate: date }

  const res = await fetch(`https://api.frankfurter.dev/v1/${date}?base=${code}&symbols=AUD`)
  if (!res.ok) {
    throw new Error(`FX lookup failed for ${code} on ${date}: ${res.status}`)
  }

  const data = (await res.json()) as { date?: string; rates?: Record<string, number> }
  const rate = data.rates?.AUD
  if (typeof rate !== 'number') {
    throw new Error(`No AUD rate available for ${code} on ${date}`)
  }

  return { currency: code, rate, rateDate: data.date ?? date }
}
