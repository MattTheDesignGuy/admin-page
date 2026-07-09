import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'

interface DuplicateMatch {
  id: string
  type: 'income' | 'expense'
  date: string
  counterparty: string
  amount: number
}

export interface DuplicateCheck {
  fileMatch: DuplicateMatch | null
  similarMatch: DuplicateMatch | null
}

export function DuplicateWarning({ duplicate }: { duplicate: DuplicateCheck }) {
  const match = duplicate.fileMatch ?? duplicate.similarMatch
  if (!match) return null

  const message = duplicate.fileMatch
    ? 'This exact file has already been logged'
    : 'A record with the same counterparty, date, and amount already exists'

  return (
    <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-bg px-4 py-3 text-sm">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
      <p className="text-ink">
        {message}: <span className="font-semibold">{match.counterparty}</span>, {formatCurrency(match.amount)} on{' '}
        {formatDate(match.date)}. You can still save this one if it's a genuine separate record —{' '}
        <Link to="/ledger" className="font-medium underline">
          check the ledger
        </Link>{' '}
        first if unsure.
      </p>
    </div>
  )
}
