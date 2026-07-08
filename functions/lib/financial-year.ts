/** Australian financial year: 1 Jul - 30 Jun */
export function currentFinancialYear(now = new Date()): { start: string; end: string; label: string } {
  const year = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
  return {
    start: `${year}-07-01`,
    end: `${year + 1}-06-30`,
    label: `FY${String(year + 1).slice(-2)}`,
  }
}

/** The 12 "YYYY-MM" months spanning a financial year, July first. */
export function financialYearMonths(fyStart: string): string[] {
  const [startYear] = fyStart.split('-').map(Number)
  const months: string[] = []
  for (let i = 0; i < 12; i++) {
    const year = i < 6 ? startYear : startYear + 1
    const month = ((6 + i) % 12) + 1
    months.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  return months
}
