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
  created_at: string
  updated_at: string
}

export const EXPENSE_CATEGORIES = [
  'Software/subscriptions',
  'Hosting',
  'Equipment',
  'Travel',
  'Professional fees',
  'Other',
] as const
