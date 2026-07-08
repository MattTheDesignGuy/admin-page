import type { Env } from '../../lib/types'
import { json } from '../../lib/http'
import { currentFinancialYear, financialYearMonths } from '../../lib/financial-year'

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

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const fy = currentFinancialYear()

  const [{ results: totalsRows }, { results: monthlyRows }] = await Promise.all([
    env.DB.prepare(
      `SELECT type, SUM(amount) as total, SUM(gst_amount) as gst_total
       FROM records WHERE date >= ? AND date <= ? GROUP BY type`,
    )
      .bind(fy.start, fy.end)
      .all<TypeTotalsRow>(),
    env.DB.prepare(
      `SELECT substr(date, 1, 7) as month, type, SUM(amount) as total
       FROM records WHERE date >= ? AND date <= ? GROUP BY month, type ORDER BY month`,
    )
      .bind(fy.start, fy.end)
      .all<MonthlyRow>(),
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
    totals: {
      income: income?.total ?? 0,
      expense: expense?.total ?? 0,
      gst_collected: income?.gst_total ?? 0,
      gst_paid: expense?.gst_total ?? 0,
      net: (income?.total ?? 0) - (expense?.total ?? 0),
    },
    monthly,
  })
}
