import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, CircleDollarSign, Download, FileText, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/Card'
import { Select } from '@/components/Select'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { Badge } from '@/components/Badge'
import { Dialog } from '@/components/Dialog'
import { RecordEditDialog } from '@/components/RecordEditDialog'
import { useToast } from '@/components/Toast'
import { api, ApiError } from '@/lib/api'
import { formatCurrency, formatDate, EXPENSE_CATEGORIES } from '@/lib/format'
import type { TdgRecord } from '@/lib/records'

type SortKey = 'date' | 'counterparty' | 'amount'

export function Ledger() {
  const { show } = useToast()
  const [records, setRecords] = useState<TdgRecord[] | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' })
  const [editing, setEditing] = useState<TdgRecord | null>(null)
  const [deleting, setDeleting] = useState<TdgRecord | null>(null)

  const load = () => {
    api
      .get<{ records: TdgRecord[] }>('/api/records')
      .then((res) => setRecords(res.records))
      .catch(() => show({ tone: 'danger', title: 'Could not load the ledger' }))
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    if (!records) return []
    const q = query.trim().toLowerCase()
    return records
      .filter((r) => typeFilter === 'all' || r.type === typeFilter)
      .filter((r) => categoryFilter === 'all' || r.category === categoryFilter)
      .filter((r) => !from || r.date >= from)
      .filter((r) => !to || r.date <= to)
      .filter(
        (r) =>
          !q ||
          r.counterparty.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q) ||
          (r.reference ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const dir = sort.dir === 'asc' ? 1 : -1
        if (sort.key === 'amount') return (a.amount - b.amount) * dir
        return a[sort.key] < b[sort.key] ? -dir : a[sort.key] > b[sort.key] ? dir : 0
      })
  }, [records, typeFilter, categoryFilter, from, to, query, sort])

  const toggleSort = (key: SortKey) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  }

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const qs = params.toString()
    return `/api/export/csv${qs ? `?${qs}` : ''}`
  }, [typeFilter, from, to])

  const togglePaid = async (record: TdgRecord) => {
    const paid = !record.paid
    try {
      const res = await api.put<{ record: TdgRecord }>(`/api/records/${record.id}`, { paid })
      setRecords((prev) => prev?.map((r) => (r.id === record.id ? res.record : r)) ?? null)
      show({ tone: 'success', title: paid ? 'Marked as paid' : 'Marked as unpaid' })
    } catch (err) {
      show({ tone: 'danger', title: 'Update failed', description: err instanceof ApiError ? err.message : undefined })
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await api.delete(`/api/records/${deleting.id}`)
      setRecords((prev) => prev?.filter((r) => r.id !== deleting.id) ?? null)
      show({ tone: 'success', title: 'Record deleted' })
    } catch (err) {
      show({ tone: 'danger', title: 'Delete failed', description: err instanceof ApiError ? err.message : undefined })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-indigo">Ledger</p>
          <h1 className="text-h1">All records</h1>
        </div>
        <a href={exportUrl} download>
          <Button variant="secondary">
            <Download size={16} />
            Export CSV
          </Button>
        </a>
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <FilterField label="Type">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
        </FilterField>
        <FilterField label="Category">
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </FilterField>
        <FilterField label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </FilterField>
        <FilterField label="Search" className="min-w-48 flex-1">
          <Input placeholder="Client, vendor, description…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </FilterField>
      </Card>

      <Card className="overflow-x-auto p-0">
        {records === null ? (
          <p className="p-8 text-center text-sm text-ink-muted">Loading…</p>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-ink-muted">Nothing logged yet.</p>
            <div className="flex gap-2">
              <Link to="/income/new">
                <Button size="sm" variant="secondary">
                  Log income
                </Button>
              </Link>
              <Link to="/expenses/new">
                <Button size="sm" variant="secondary">
                  Log expense
                </Button>
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">No records match these filters.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline-subtle text-left text-ink-muted">
                <Th onClick={() => toggleSort('date')}>Date</Th>
                <Th onClick={() => toggleSort('counterparty')}>Counterparty</Th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Category / Ref</th>
                <Th onClick={() => toggleSort('amount')} align="right">
                  Amount
                </Th>
                <th className="px-4 py-3 font-medium">GST</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-hairline-subtle last:border-0 hover:bg-surface-sunken">
                  <td className="whitespace-nowrap px-4 py-3 text-ink">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-ink">
                    <div className="flex items-center gap-2">
                      <Badge tone={r.type === 'income' ? 'success' : 'accent'}>{r.type}</Badge>
                      {r.type === 'income' && !r.paid && <Badge tone="warning">unpaid</Badge>}
                      {r.counterparty}
                    </div>
                  </td>
                  <td className="max-w-64 truncate px-4 py-3 text-ink-muted">{r.description}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.category ?? r.reference ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-ink">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {r.gst_status === 'amount' ? formatCurrency(r.gst_amount) : 'Free'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {r.type === 'income' && (
                        <IconButton
                          aria-label={r.paid ? 'Mark as unpaid' : 'Mark as paid'}
                          onClick={() => void togglePaid(r)}
                          className={r.paid ? 'text-success!' : 'text-danger!'}
                        >
                          <CircleDollarSign size={16} />
                        </IconButton>
                      )}
                      {r.file_key && (
                        <a href={`/api/files/${r.id}`} target="_blank" rel="noreferrer">
                          <IconButton aria-label="View original file">
                            <FileText size={16} />
                          </IconButton>
                        </a>
                      )}
                      <IconButton aria-label="Edit record" onClick={() => setEditing(r)}>
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton aria-label="Delete record" onClick={() => setDeleting(r)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editing && (
        <RecordEditDialog
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRecords((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)) ?? null)
            setEditing(null)
            show({ tone: 'success', title: 'Record updated' })
          }}
        />
      )}

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete record">
        <p className="text-sm text-ink-muted">
          Delete {deleting?.counterparty}'s {deleting?.type} record from {deleting && formatDate(deleting.date)}? This can't
          be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function FilterField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 text-xs font-medium text-ink-muted ${className ?? ''}`}>
      {label}
      {children}
    </label>
  )
}

function Th({
  children,
  onClick,
  align = 'left',
}: {
  children: React.ReactNode
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <th className={`px-4 py-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition-colors duration-[120ms] ease-out hover:text-ink ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {children}
        <ArrowUpDown size={12} />
      </button>
    </th>
  )
}
