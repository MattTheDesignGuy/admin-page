/** Client-side mirror of functions/lib/financial-year.ts's start-year + label logic. */
export function currentFinancialYearStartYear(now = new Date()): number {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
}

export function fyLabel(startYear: number): string {
  return `${String(startYear).slice(-2)}/${String(startYear + 1).slice(-2)}`
}
