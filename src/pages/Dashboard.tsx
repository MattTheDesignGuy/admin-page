import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileUp, Receipt } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { formatCurrency } from '@/lib/format'
import { api } from '@/lib/api'

interface DashboardSummary {
  fy: { start: string; end: string; label: string; startYear: number }
  isCurrent: boolean
  totals: { income: number; expense: number; gst_collected: number; gst_paid: number; net: number }
  monthly: Array<{ month: string; income: number; expense: number }>
}

const MONTH_LABELS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    const query = year !== null ? `?year=${year}` : ''
    api
      .get<DashboardSummary>(`/api/dashboard/summary${query}`)
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [year])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1">
            <IconButton
              aria-label="Previous financial year"
              onClick={() => setYear((summary?.fy.startYear ?? 0) - 1)}
              disabled={!summary}
            >
              <ChevronLeft size={16} />
            </IconButton>
            <p className="text-eyebrow text-indigo w-14 text-center">{summary?.fy.label ?? ' '}</p>
            <IconButton
              aria-label="Next financial year"
              onClick={() => setYear((summary?.fy.startYear ?? 0) + 1)}
              disabled={!summary || summary.isCurrent}
            >
              <ChevronRight size={16} />
            </IconButton>
          </div>
          <h1 className="text-h1">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/income/new">
            <Button variant="secondary">
              <FileUp size={16} />
              Log income
            </Button>
          </Link>
          <Link to="/expenses/new">
            <Button variant="secondary">
              <Receipt size={16} />
              Log expense
            </Button>
          </Link>
        </div>
      </div>

      {!summary ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Income" value={summary.totals.income} />
            <StatCard label="Expenses" value={summary.totals.expense} />
            <StatCard label="GST collected" value={summary.totals.gst_collected} />
            <StatCard label="GST paid" value={summary.totals.gst_paid} />
            <StatCard label="Net" value={summary.totals.net} emphasis />
          </div>

          <Card className="p-6">
            <h2 className="text-h3 mb-4">Income vs. expenses by month</h2>
            <MonthlyChart data={summary.monthly} />
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  if (emphasis) {
    return (
      <Card className="bg-action-gradient border-none p-5 text-white">
        <p className="text-eyebrow text-ink-on-dark-muted">{label}</p>
        <p className="text-h2 mt-1 text-white">{formatCurrency(value)}</p>
      </Card>
    )
  }
  return (
    <Card className="p-5">
      <p className="text-eyebrow text-ink-faint">{label}</p>
      <p className="text-h2 mt-1">{formatCurrency(value)}</p>
    </Card>
  )
}

function MonthlyChart({ data }: { data: Array<{ month: string; income: number; expense: number }> }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]))
  const chartHeight = 180
  const barWidth = 14
  const groupWidth = 56
  const width = data.length * groupWidth

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${chartHeight + 24}`} width={width} height={chartHeight + 24} className="min-w-full">
        {data.map((d, i) => {
          const x = i * groupWidth + groupWidth / 2
          const incomeHeight = (d.income / max) * chartHeight
          const expenseHeight = (d.expense / max) * chartHeight
          return (
            <g key={d.month}>
              <rect
                x={x - barWidth - 2}
                y={chartHeight - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                rx={2}
                fill="url(#tdg-action-gradient)"
              />
              <rect
                x={x + 2}
                y={chartHeight - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                rx={2}
                fill="var(--color-neutral-300)"
              />
              <text x={x} y={chartHeight + 18} textAnchor="middle" fontSize="11" fill="var(--color-ink-faint)">
                {MONTH_LABELS[i]}
              </text>
            </g>
          )
        })}
        <defs>
          <linearGradient id="tdg-action-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#205AFE" />
            <stop offset="1" stopColor="#6930E8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="bg-action-gradient h-2.5 w-2.5 rounded-sm" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-neutral-300" /> Expenses
        </span>
      </div>
    </div>
  )
}
