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
