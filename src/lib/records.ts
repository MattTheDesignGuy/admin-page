export interface TdgRecord {
  id: string
  type: 'income' | 'expense'
  date: string
  counterparty: string
  description: string | null
  amount: number
  gst_status: 'free' | 'amount'
  gst_amount: number
  category: string | null
  reference: string | null
  file_key: string | null
  file_name: string | null
  file_hash: string | null
  paid: number
  amount_paid: number
  original_currency: string | null
  original_amount: number | null
  fx_rate: number | null
  fx_rate_date: string | null
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
