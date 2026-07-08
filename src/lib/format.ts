const AUD_FORMATTER = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })
const DATE_FORMATTER = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })

export function formatCurrency(amount: number): string {
  return AUD_FORMATTER.format(amount)
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  return DATE_FORMATTER.format(new Date(iso))
}

/** Australian financial year: 1 Jul - 30 Jun */
export function currentFinancialYear(now = new Date()): { start: string; end: string; label: string } {
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return {
    start: `${year}-07-01`,
    end: `${year + 1}-06-30`,
    label: `FY${String(year + 1).slice(-2)}`,
  }
}

export const EXPENSE_CATEGORIES = [
  'Software/subscriptions',
  'Hosting',
  'Equipment',
  'Travel',
  'Professional fees',
  'Other',
] as const
