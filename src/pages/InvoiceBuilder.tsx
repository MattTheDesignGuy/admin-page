import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import { Select } from '@/components/Select'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { useToast } from '@/components/Toast'
import { api, ApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { calculateTotals, type LineItemDraft } from '@/lib/invoice-calc'
import type { TdgRecord } from '@/lib/records'

interface LineItemForm {
  description: string
  qty: string
  unit_price: string
  gstMode: 'free' | 'amount'
  gstAmount: string
}

interface Client {
  id: string
  business_name: string
  attention: string | null
  address_lines: string | null
}

const QUICK_ADD_ITEMS: Array<{ description: string; unit_price: number }> = [
  { description: 'Website build, deployment and optimisation. 12 months hosting & technical support', unit_price: 2500 },
  { description: 'Logo redesign & brand style guide.', unit_price: 500 },
  { description: 'Website build, deployment and 12 months hosting.', unit_price: 1000 },
  { description: 'Website upgrades, improvements & maintenance', unit_price: 300 },
  { description: 'Community Calendar build', unit_price: 300 },
  { description: 'FTP server Annual Hosting', unit_price: 185 },
  { description: 'MAKE.com Server Annual Hosting', unit_price: 167 },
  { description: 'Website Maintenance', unit_price: 300 },
]

function emptyLineItem(): LineItemForm {
  return { description: '', qty: '1', unit_price: '', gstMode: 'free', gstAmount: '' }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function InvoiceBuilder() {
  const { show } = useToast()
  const navigate = useNavigate()

  const [invoiceNumber, setInvoiceNumber] = useState('…')
  const [clients, setClients] = useState<Client[]>([])
  const [invoiceDate, setInvoiceDate] = useState(todayIso())
  const [dueDate, setDueDate] = useState(addDaysIso(todayIso(), 7))
  const [reference, setReference] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [attention, setAttention] = useState('')
  const [addressLines, setAddressLines] = useState('')
  const [lineItems, setLineItems] = useState<LineItemForm[]>([emptyLineItem()])
  const [deposit, setDeposit] = useState('')
  const [depositLabel, setDepositLabel] = useState('Less: Deposit received.')
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<{ invoice_number: string }>('/api/invoices/next-number').then((res) => setInvoiceNumber(res.invoice_number))
    api.get<{ clients: Client[] }>('/api/invoices/clients').then((res) => setClients(res.clients))
  }, [])

  const parsedLineItems: LineItemDraft[] = useMemo(
    () =>
      lineItems.map((item) => ({
        description: item.description,
        qty: Number(item.qty) || 0,
        unit_price: Number(item.unit_price) || 0,
        gst: item.gstMode === 'free' ? ('Free' as const) : Number(item.gstAmount) || 0,
      })),
    [lineItems],
  )

  const totals = useMemo(
    () => calculateTotals(parsedLineItems, Number(deposit) || 0),
    [parsedLineItems, deposit],
  )

  const handleBusinessNameBlur = () => {
    const match = clients.find((c) => c.business_name.toLowerCase() === businessName.trim().toLowerCase())
    if (!match) return
    if (!attention && match.attention) setAttention(match.attention)
    if (!addressLines && match.address_lines) {
      try {
        const parsed = JSON.parse(match.address_lines) as string[]
        if (Array.isArray(parsed) && parsed.length) setAddressLines(parsed.join('\n'))
      } catch {
        // ignore malformed stored address
      }
    }
  }

  const updateLineItem = (index: number, patch: Partial<LineItemForm>) => {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeLineItem = (index: number) => {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  const addLineItem = (prefill?: Partial<LineItemForm>) => {
    setLineItems((prev) => [...prev, { ...emptyLineItem(), ...prefill }])
  }

  const buildPayload = () => ({
    invoice_date: invoiceDate,
    due_date: dueDate,
    reference: reference || null,
    bill_to: {
      business_name: businessName,
      attention: attention || null,
      address_lines: addressLines.split('\n').map((l) => l.trim()).filter(Boolean),
    },
    line_items: parsedLineItems,
    deposit: Number(deposit) || 0,
    deposit_label: depositLabel || null,
  })

  const validate = (): string | null => {
    if (!businessName.trim()) return 'Client business name is required.'
    if (parsedLineItems.length === 0 || parsedLineItems.every((i) => !i.description.trim())) {
      return 'At least one line item is required.'
    }
    for (const item of parsedLineItems) {
      if (!item.description.trim()) return 'Every line item needs a description.'
      if (!item.unit_price) return 'Every line item needs a unit price.'
    }
    return null
  }

  const handlePreview = async () => {
    const error = validate()
    if (error) {
      show({ tone: 'warning', title: 'Check the form', description: error })
      return
    }
    setPreviewing(true)
    try {
      const blob = await api.postForBlob('/api/invoices/preview', buildPayload())
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      show({ tone: 'danger', title: 'Preview failed', description: err instanceof ApiError ? err.message : undefined })
    } finally {
      setPreviewing(false)
    }
  }

  const handleSave = async () => {
    const error = validate()
    if (error) {
      show({ tone: 'warning', title: 'Check the form', description: error })
      return
    }
    setSaving(true)
    try {
      const res = await api.post<{ invoice: { invoice_number: string }; record: TdgRecord }>(
        '/api/invoices',
        buildPayload(),
      )
      show({
        tone: 'success',
        title: `${res.invoice.invoice_number} created`,
        description: `${businessName} — logged to the ledger as unpaid.`,
      })
      navigate('/ledger')
    } catch (err) {
      show({ tone: 'danger', title: 'Save failed', description: err instanceof ApiError ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-eyebrow text-indigo">{invoiceNumber}</p>
        <h1 className="text-h1">New invoice</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Fill in the details, preview the PDF, then save — it's logged to the ledger as unpaid until you mark it paid.
        </p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Invoice date">
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Reference (optional)">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. TDG - Website Build" />
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">Bill to</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <Input
              list="client-suggestions"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onBlur={handleBusinessNameBlur}
              required
            />
            <datalist id="client-suggestions">
              {clients.map((c) => (
                <option key={c.id} value={c.business_name} />
              ))}
            </datalist>
          </Field>
          <Field label="Attention (optional)">
            <Input value={attention} onChange={(e) => setAttention(e.target.value)} />
          </Field>
        </div>
        <Field label="Address (optional, one line each)">
          <Textarea rows={3} value={addressLines} onChange={(e) => setAddressLines(e.target.value)} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h3">Line items</h2>
          <QuickAddMenu onAdd={(item) => addLineItem({ description: item.description, unit_price: String(item.unit_price) })} />
        </div>

        <div className="flex flex-col gap-4">
          {lineItems.map((item, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-md border border-hairline-subtle p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Field label="Description">
                    <Textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => updateLineItem(index, { description: e.target.value })}
                    />
                  </Field>
                </div>
                <IconButton
                  aria-label="Remove line item"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                  className="mt-6"
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Qty">
                  <Input type="number" step="1" value={item.qty} onChange={(e) => updateLineItem(index, { qty: e.target.value })} />
                </Field>
                <Field label="Unit price">
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(index, { unit_price: e.target.value })}
                  />
                </Field>
                <Field label="GST">
                  <Select
                    value={item.gstMode}
                    onChange={(e) => updateLineItem(index, { gstMode: e.target.value as 'free' | 'amount' })}
                  >
                    <option value="free">Free</option>
                    <option value="amount">Amount</option>
                  </Select>
                </Field>
                <Field label="GST amount">
                  <Input
                    type="number"
                    step="0.01"
                    value={item.gstAmount}
                    onChange={(e) => updateLineItem(index, { gstAmount: e.target.value })}
                    disabled={item.gstMode === 'free'}
                  />
                </Field>
              </div>
              <p className="text-right text-sm text-ink-muted">
                {formatCurrency((Number(item.qty) || 0) * (Number(item.unit_price) || 0))}
              </p>
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={() => addLineItem()} className="self-start">
          <Plus size={14} />
          Add line item
        </Button>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">Deposit (optional)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Deposit amount">
            <Input type="number" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </Field>
          <Field label="Label">
            <Input value={depositLabel} onChange={(e) => setDepositLabel(e.target.value)} disabled={!deposit} />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <div className="ml-auto flex max-w-xs flex-col gap-2 text-sm">
          <TotalRow label="Subtotal" value={totals.subtotal} />
          <TotalRow label={totals.gstTotal === 0 ? 'Total GST Free' : 'Total GST'} value={totals.gstTotal} />
          <TotalRow label="Total" value={totals.total} emphasis />
          {Number(deposit) > 0 && <TotalRow label="Amount due" value={totals.amountDue} emphasis />}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => void handlePreview()} disabled={previewing}>
          {previewing ? 'Generating…' : 'Preview PDF'}
        </Button>
        <Button type="button" size="lg" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save & log to ledger'}
        </Button>
      </div>
    </div>
  )
}

function QuickAddMenu({ onAdd }: { onAdd: (item: { description: string; unit_price: number }) => void }) {
  return (
    <div className="relative">
      <Select
        value=""
        onChange={(e) => {
          const item = QUICK_ADD_ITEMS[Number(e.target.value)]
          if (item) onAdd(item)
          e.target.value = ''
        }}
        className="w-48"
      >
        <option value="" disabled>
          Quick add…
        </option>
        {QUICK_ADD_ITEMS.map((item, i) => (
          <option key={item.description} value={i}>
            {item.description.length > 40 ? `${item.description.slice(0, 40)}…` : item.description}
          </option>
        ))}
      </Select>
    </div>
  )
}

function TotalRow({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`flex justify-between ${emphasis ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
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
