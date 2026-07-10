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

interface UnpaidRow {
  count: number
  total: number | null
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const currentStartYear = currentFinancialYearStartYear()
  const yearParam = new URL(request.url).searchParams.get('year')
  const requestedYear = yearParam ? Number(yearParam) : currentStartYear
  const startYear = Number.isFinite(requestedYear) ? requestedYear : currentStartYear
  const fy = financialYearFromStartYear(startYear)

  // Unpaid income doesn't count toward FY totals yet — only paid income and
  // all expenses do.
  const countedFilter = `date >= ? AND date <= ? AND (type = 'expense' OR paid = 1)`

  const [{ results: totalsRows }, { results: monthlyRows }, unpaid] = await Promise.all([
    env.DB.prepare(`SELECT type, SUM(amount) as total, SUM(gst_amount) as gst_total FROM records WHERE ${countedFilter} GROUP BY type`)
      .bind(fy.start, fy.end)
      .all<TypeTotalsRow>(),
    env.DB.prepare(
      `SELECT substr(date, 1, 7) as month, type, SUM(amount) as total FROM records WHERE ${countedFilter} GROUP BY month, type ORDER BY month`,
    )
      .bind(fy.start, fy.end)
      .all<MonthlyRow>(),
    env.DB.prepare(
      `SELECT COUNT(*) as count, SUM(amount) as total FROM records
       WHERE type = 'income' AND paid = 0 AND date >= ? AND date <= ?`,
    )
      .bind(fy.start, fy.end)
      .first<UnpaidRow>(),
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
    unpaidIncome: {
      count: unpaid?.count ?? 0,
      total: unpaid?.total ?? 0,
    },
    monthly,
  })
}
