import type { Env } from '../../lib/types'
import { json } from '../../lib/http'
import {
  currentFinancialYearStartYear,
  financialYearFromStartYear,
  financialYearMonths,
} from '../../lib/financial-year'

interface TypeTotalsRow {
  type: 'income' | 'expense'
  total: number | null
  gst_total: number | null
}

interface MonthlyRow {
  month: string
  type: 'income' | 'expense'
  total: number | null
}

interface OutstandingRow {
  count: number
  total: number | null
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const currentStartYear = currentFinancialYearStartYear()
  const yearParam = new URL(request.url).searchParams.get('year')
  const requestedYear = yearParam ? Number(yearParam) : currentStartYear
  const startYear = Number.isFinite(requestedYear) ? requestedYear : currentStartYear
  const fy = financialYearFromStartYear(startYear)

  // Cash basis: expenses count in full, income counts only what's actually
  // been paid so far (amount_paid) — a partial payment on an invoice shows
  // up immediately, the unpaid remainder doesn't until it's paid too.
  const countedFilter = `date >= ? AND date <= ? AND (type = 'expense' OR amount_paid > 0)`
  const amountExpr = `CASE WHEN type = 'expense' THEN amount ELSE amount_paid END`
  const gstExpr = `CASE WHEN type = 'expense' THEN gst_amount WHEN amount > 0 THEN gst_amount * amount_paid / amount ELSE 0 END`

  const [{ results: totalsRows }, { results: monthlyRows }, outstanding] = await Promise.all([
    env.DB.prepare(
      `SELECT type, SUM(${amountExpr}) as total, SUM(${gstExpr}) as gst_total FROM records WHERE ${countedFilter} GROUP BY type`,
    )
      .bind(fy.start, fy.end)
      .all<TypeTotalsRow>(),
    env.DB.prepare(
      `SELECT substr(date, 1, 7) as month, type, SUM(${amountExpr}) as total FROM records WHERE ${countedFilter} GROUP BY month, type ORDER BY month`,
    )
      .bind(fy.start, fy.end)
      .all<MonthlyRow>(),
    env.DB.prepare(
      `SELECT COUNT(*) as count, SUM(amount - amount_paid) as total FROM records
       WHERE type = 'income' AND amount_paid < amount AND date >= ? AND date <= ?`,
    )
      .bind(fy.start, fy.end)
      .first<OutstandingRow>(),
  ])

  const income = totalsRows.find((r) => r.type === 'income')
  const expense = totalsRows.find((r) => r.type === 'expense')

  const months = financialYearMonths(fy.start)
  const monthly = months.map((month) => {
    const incomeRow = monthlyRows.find((r) => r.month === month && r.type === 'income')
    const expenseRow = monthlyRows.find((r) => r.month === month && r.type === 'expense')
    return {
      month,
      income: incomeRow?.total ?? 0,
      expense: expenseRow?.total ?? 0,
    }
  })

  return json({
    fy,
    isCurrent: startYear === currentStartYear,
    totals: {
      income: income?.total ?? 0,
      expense: expense?.total ?? 0,
      gst_collected: income?.gst_total ?? 0,
      gst_paid: expense?.gst_total ?? 0,
      net: (income?.total ?? 0) - (expense?.total ?? 0),
    },
    outstandingIncome: {
      count: outstanding?.count ?? 0,
      total: outstanding?.total ?? 0,
    },
    monthly,
  })
}
