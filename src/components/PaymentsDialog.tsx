import { useEffect, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Dialog } from '@/components/Dialog'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { api, ApiError } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import type { TdgRecord, Payment } from '@/lib/records'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PaymentsDialog({
  record,
  onClose,
  onUpdated,
}: {
  record: TdgRecord
  onClose: () => void
  onUpdated: (updated: TdgRecord) => void
}) {
  const [current, setCurrent] = useState(record)
  const [payments, setPayments] = useState<Payment[] | null>(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const balance = Math.max(0, current.amount - current.amount_paid)

  useEffect(() => {
    api
      .get<{ payments: Payment[] }>(`/api/records/${record.id}/payments`)
      .then((res) => setPayments(res.payments))
      .catch(() => setPayments([]))
  }, [record.id])

  const applyUpdate = (updated: TdgRecord) => {
    setCurrent(updated)
    onUpdated(updated)
  }

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post<{ payment: Payment; record: TdgRecord }>(`/api/records/${record.id}/payments`, {
        amount: Number(amount),
        date,
        note: note || null,
      })
      setPayments((prev) => [res.payment, ...(prev ?? [])])
      applyUpdate(res.record)
      setAmount('')
      setNote('')
      setDate(todayIso())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record payment.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (paymentId: string) => {
    try {
      const res = await api.delete<{ record: TdgRecord }>(`/api/records/${record.id}/payments/${paymentId}`)
      setPayments((prev) => prev?.filter((p) => p.id !== paymentId) ?? null)
      applyUpdate(res.record)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete payment.')
    }
  }

  return (
    <Dialog open onClose={onClose} title="Payments">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 rounded-md bg-surface-sunken p-3 text-sm">
          <SummaryStat label="Invoice total" value={formatCurrency(current.amount)} />
          <SummaryStat label="Paid" value={formatCurrency(current.amount_paid)} tone="success" />
          <SummaryStat label="Balance due" value={formatCurrency(balance)} tone={balance > 0 ? 'danger' : undefined} />
        </div>

        {payments === null ? (
          <p className="text-sm text-ink-muted">Loading payment history…</p>
        ) : payments.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-md border border-hairline-subtle px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-ink">{formatCurrency(p.amount)}</span>{' '}
                  <span className="text-ink-muted">on {formatDate(p.date)}</span>
                  {p.note && <span className="block text-xs text-ink-muted">{p.note}</span>}
                </div>
                <IconButton aria-label="Delete payment" onClick={() => void handleDelete(p.id)}>
                  <Trash2 size={14} />
                </IconButton>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No payments recorded yet.</p>
        )}

        {balance > 0 && (
          <form onSubmit={(e) => void handleAdd(e)} className="flex flex-col gap-3 border-t border-hairline-subtle pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount">
                <Input
                  type="number"
                  step="0.01"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </Field>
              <Field label="Date">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
            </div>
            <Field label="Note (optional)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank transfer" />
            </Field>
            {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAmount(String(balance))}>
                Fill balance
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Recording…' : 'Record payment'}
              </Button>
            </div>
          </form>
        )}

        {balance === 0 && (
          <div className="flex justify-end border-t border-hairline-subtle pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`text-sm font-semibold ${tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
      {label}
      {children}
    </label>
  )
}
