export interface Env {
  DB: D1Database
  FILES: R2Bucket
  ADMIN_USERNAME: string
  ADMIN_PASSWORD_HASH: string
  SESSION_SECRET: string
  ANTHROPIC_API_KEY: string
}

export type RecordType = 'income' | 'expense'
export type GstStatus = 'free' | 'amount'

export interface Record {
  id: string
  type: RecordType
  date: string
  counterparty: string
  description: string | null
  amount: number
  gst_status: GstStatus
  gst_amount: number
  category: string | null
  reference: string | null
  file_key: string | null
  file_name: string | null
  file_hash: string | null
  paid: number
  amount_paid: number
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  record_id: string
  amount: number
  date: string
  note: string | null
  created_at: string
}

export const EXPENSE_CATEGORIES = [
  'Software/subscriptions',
  'Hosting',
  'Equipment',
  'Travel',
  'Professional fees',
  'Other',
] as const

export interface LineItem {
  description: string
  qty: number
  unit_price: number
  gst: 'Free' | number
}

export interface Client {
  id: string
  business_name: string
  attention: string | null
  address_lines: string | null // JSON string array
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  invoice_date: string
  due_date: string
  reference: string | null
  line_items: string // JSON LineItem[]
  deposit: number
  deposit_label: string | null
  subtotal: number
  gst_total: number
  total: number
  amount_due: number
  file_key: string
  record_id: string
  created_at: string
}

export interface InvoiceDraft {
  invoice_date: string
  due_date?: string
  reference?: string | null
  bill_to: {
    business_name: string
    attention?: string | null
    address_lines?: string[]
  }
  line_items: LineItem[]
  deposit?: number
  deposit_label?: string | null
}
