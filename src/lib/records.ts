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
  created_at: string
  updated_at: string
}
