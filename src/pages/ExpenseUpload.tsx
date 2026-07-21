import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/Card'
import { Dropzone } from '@/components/Dropzone'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import { Select } from '@/components/Select'
import { Button } from '@/components/Button'
import { useToast } from '@/components/Toast'
import { DuplicateWarning, type DuplicateCheck } from '@/components/DuplicateWarning'
import { api, ApiError } from '@/lib/api'
import { EXPENSE_CATEGORIES } from '@/lib/format'

interface ExpenseForm {
  counterparty: string
  date: string
  amount: string
  gst_status: 'free' | 'amount'
  gst_amount: string
  category: string
  description: string
  currency: string
  originalAmount: string
  originalGstAmount: string
  fxRate: string
  fxRateDate: string
}

const emptyForm: ExpenseForm = {
  counterparty: '',
  date: '',
  amount: '',
  gst_status: 'amount',
  gst_amount: '',
  category: EXPENSE_CATEGORIES[0],
  description: '',
  currency: 'AUD',
  originalAmount: '',
  originalGstAmount: '',
  fxRate: '',
  fxRateDate: '',
}

interface FxRate {
  currency: string
  rate: number
  rateDate: string
}

export function ExpenseUpload() {
  const { show } = useToast()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fetchingRate, setFetchingRate] = useState(false)
  const [form, setForm] = useState<ExpenseForm | null>(null)
  const [duplicate, setDuplicate] = useState<DuplicateCheck | null>(null)

  const isForeign = form ? form.currency.trim().toUpperCase() !== 'AUD' : false

  const handleFile = async (selected: File) => {
    setFile(selected)
    setExtracting(true)
    setForm(null)
    setDuplicate(null)
    try {
      const body = new FormData()
      body.append('file', selected)
      const res = await api.post<{
        extraction: {
          vendor: string | null
          date: string | null
          amount: number | null
          currency: string | null
          gst_status: 'free' | 'amount' | null
          gst_amount: number | null
          category: string | null
          description: string | null
        }
        conversion: { currency: string; rate: number; rateDate: string; amountAud: number; gstAmountAud: number } | null
        conversionError?: string | null
        mocked?: boolean
        duplicate?: DuplicateCheck
      }>('/api/extract/expense', body)
      const e = res.extraction
      const currency = (e.currency ?? 'AUD').toUpperCase()
      const conv = res.conversion

      setForm({
        counterparty: e.vendor ?? '',
        date: e.date ?? '',
        amount: (conv ? conv.amountAud : e.amount)?.toString() ?? '',
        gst_status: e.gst_status ?? 'amount',
        gst_amount: (conv ? conv.gstAmountAud : e.gst_amount)?.toString() ?? '',
        category: e.category ?? EXPENSE_CATEGORIES[0],
        description: e.description ?? '',
        currency,
        originalAmount: currency !== 'AUD' ? (e.amount?.toString() ?? '') : '',
        originalGstAmount: currency !== 'AUD' ? (e.gst_amount?.toString() ?? '') : '',
        fxRate: conv ? conv.rate.toString() : '',
        fxRateDate: conv ? conv.rateDate : '',
      })
      setDuplicate(res.duplicate ?? null)
      if (res.mocked) {
        show({
          tone: 'warning',
          title: 'Using sample data',
          description: 'No ANTHROPIC_API_KEY set — add one to extract real fields. Edit the sample below and save as normal.',
        })
      } else if (currency !== 'AUD' && res.conversionError) {
        show({
          tone: 'warning',
          title: `Detected ${currency}, but couldn't fetch a rate`,
          description: res.conversionError,
        })
      } else if (currency !== 'AUD') {
        show({
          tone: 'success',
          title: `Converted from ${currency}`,
          description: conv ? `Rate ${conv.rate} on ${conv.rateDate} (ECB via Frankfurter).` : undefined,
        })
      } else {
        show({ tone: 'success', title: 'Fields extracted', description: 'Check them over before saving.' })
      }
    } catch (err) {
      setForm({ ...emptyForm })
      show({
        tone: 'warning',
        title: 'Extraction failed',
        description: err instanceof ApiError ? err.message : 'Fill in the details manually below.',
      })
    } finally {
      setExtracting(false)
    }
  }

  const refreshRate = async () => {
    if (!form) return
    const currency = form.currency.trim().toUpperCase()
    if (!currency || currency === 'AUD' || !form.date) {
      show({ tone: 'warning', title: 'Need a currency and date first' })
      return
    }
    setFetchingRate(true)
    try {
      const res = await api.get<{ fx: FxRate }>(`/api/fx/rate?currency=${currency}&date=${form.date}`)
      const originalAmount = Number(form.originalAmount) || 0
      const originalGstAmount = Number(form.originalGstAmount) || 0
      setForm({
        ...form,
        currency,
        fxRate: res.fx.rate.toString(),
        fxRateDate: res.fx.rateDate,
        amount: originalAmount ? (originalAmount * res.fx.rate).toFixed(2) : form.amount,
        gst_amount: originalGstAmount ? (originalGstAmount * res.fx.rate).toFixed(2) : form.gst_amount,
      })
      show({ tone: 'success', title: `Rate fetched`, description: `1 ${currency} = ${res.fx.rate} AUD on ${res.fx.rateDate}` })
    } catch (err) {
      show({ tone: 'danger', title: 'Rate lookup failed', description: err instanceof ApiError ? err.message : undefined })
    } finally {
      setFetchingRate(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form || !file) return
    setSaving(true)
    try {
      const body = new FormData()
      body.append('type', 'expense')
      body.append('date', form.date)
      body.append('counterparty', form.counterparty)
      body.append('description', form.description)
      body.append('amount', form.amount)
      body.append('gst_status', form.gst_status)
      body.append('gst_amount', form.gst_amount || '0')
      body.append('category', form.category)
      body.append('file', file)
      const currency = form.currency.trim().toUpperCase()
      if (currency && currency !== 'AUD') {
        body.append('original_currency', currency)
        body.append('original_amount', form.originalAmount || '0')
        body.append('fx_rate', form.fxRate || '0')
        body.append('fx_rate_date', form.fxRateDate || form.date)
      }
      await api.post('/api/records', body)
      show({ tone: 'success', title: 'Expense saved', description: `${form.counterparty} — logged to the ledger.` })
      navigate('/ledger')
    } catch (err) {
      show({ tone: 'danger', title: 'Save failed', description: err instanceof ApiError ? err.message : 'Try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-eyebrow text-indigo">Expense</p>
        <h1 className="text-h1">Log expense</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Drop a receipt or bill — Claude pulls out the fields, you confirm before it's saved. Bills in a foreign
          currency (USD SaaS subscriptions, etc.) are converted to AUD using the historical rate on the bill date.
        </p>
      </div>

      <Card className="p-6">
        <Dropzone accept=".pdf,.jpg,.jpeg,.png,.webp" onFileSelected={(f) => void handleFile(f)} disabled={extracting || saving} />
      </Card>

      {extracting && <p className="text-center text-sm text-ink-muted">Extracting fields…</p>}

      {form && (
        <Card className="p-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            {duplicate && <DuplicateWarning duplicate={duplicate} />}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Vendor">
                <Input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} required />
              </Field>
              <Field label="Category">
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date">
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </Field>
              <Field label="Currency">
                <Input
                  value={form.currency}
                  maxLength={3}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </Field>
            </div>

            {isForeign && (
              <div className="flex flex-col gap-3 rounded-md border border-hairline-subtle bg-surface-sunken p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label={`Original amount (${form.currency})`}>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.originalAmount}
                      onChange={(e) => setForm({ ...form, originalAmount: e.target.value })}
                    />
                  </Field>
                  <Field label={`Original GST (${form.currency})`}>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.originalGstAmount}
                      onChange={(e) => setForm({ ...form, originalGstAmount: e.target.value })}
                      disabled={form.gst_status === 'free'}
                    />
                  </Field>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
                  <span>
                    {form.fxRate
                      ? `1 ${form.currency} = ${form.fxRate} AUD on ${form.fxRateDate} (ECB via Frankfurter)`
                      : 'No rate fetched yet — amounts below need converting manually or via the button.'}
                  </span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void refreshRate()} disabled={fetchingRate}>
                    {fetchingRate ? 'Fetching…' : form.fxRate ? 'Refresh rate' : 'Fetch rate'}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={isForeign ? 'Amount (AUD, converted)' : 'Amount (AUD)'}>
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
              <Field label={isForeign ? 'GST amount (AUD, converted)' : 'GST amount'}>
                <Input
                  type="number"
                  step="0.01"
                  value={form.gst_amount}
                  onChange={(e) => setForm({ ...form, gst_amount: e.target.value })}
                  disabled={form.gst_status === 'free'}
                />
              </Field>
            </div>
            <Field label="Description">
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Button type="submit" size="lg" disabled={saving} className="self-start">
              {saving ? 'Saving…' : 'Save to ledger'}
            </Button>
          </form>
        </Card>
      )}
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
