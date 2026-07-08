import { useState, type FormEvent } from 'react'
import { Dialog } from '@/components/Dialog'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import { Select } from '@/components/Select'
import { Button } from '@/components/Button'
import { api, ApiError } from '@/lib/api'
import { EXPENSE_CATEGORIES } from '@/lib/format'
import type { TdgRecord } from '@/lib/records'

export function RecordEditDialog({
  record,
  onClose,
  onSaved,
}: {
  record: TdgRecord
  onClose: () => void
  onSaved: (updated: TdgRecord) => void
}) {
  const [form, setForm] = useState({
    date: record.date,
    counterparty: record.counterparty,
    description: record.description ?? '',
    amount: String(record.amount),
    gst_status: record.gst_status,
    gst_amount: String(record.gst_amount),
    category: record.category ?? EXPENSE_CATEGORIES[0],
    reference: record.reference ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await api.put<{ record: TdgRecord }>(`/api/records/${record.id}`, {
        date: form.date,
        counterparty: form.counterparty,
        description: form.description || null,
        amount: Number(form.amount),
        gst_status: form.gst_status,
        gst_amount: Number(form.gst_amount) || 0,
        category: record.type === 'expense' ? form.category : null,
        reference: record.type === 'income' ? form.reference || null : null,
      })
      onSaved(res.record)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Edit ${record.type === 'income' ? 'income' : 'expense'}`}>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={record.type === 'income' ? 'Client' : 'Vendor'}>
            <Input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} required />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </Field>
          <Field label="Amount (AUD)">
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </Field>
          <Field label="GST">
            <Select
              value={form.gst_status}
              onChange={(e) => setForm({ ...form, gst_status: e.target.value as 'free' | 'amount' })}
            >
              <option value="amount">GST included</option>
              <option value="free">GST-free</option>
            </Select>
          </Field>
          <Field label="GST amount">
            <Input
              type="number"
              step="0.01"
              value={form.gst_amount}
              onChange={(e) => setForm({ ...form, gst_amount: e.target.value })}
              disabled={form.gst_status === 'free'}
            />
          </Field>
          {record.type === 'expense' ? (
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Invoice number">
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </Field>
          )}
        </div>
        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Dialog>
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
