import type { Env, Record as TdgRecord } from '../../lib/types'
import { csvRow } from '../../lib/csv'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const type = url.searchParams.get('type')

  const conditions: string[] = []
  const bindings: string[] = []

  if (from) {
    conditions.push('date >= ?')
    bindings.push(from)
  }
  if (to) {
    conditions.push('date <= ?')
    bindings.push(to)
  }
  if (type === 'income' || type === 'expense') {
    conditions.push('type = ?')
    bindings.push(type)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const { results } = await env.DB.prepare(`SELECT * FROM records ${where} ORDER BY date ASC`)
    .bind(...bindings)
    .all<TdgRecord>()

  let csv = csvRow([
    'Date',
    'Type',
    'Counterparty',
    'Description',
    'Amount',
    'GST Status',
    'GST Amount',
    'Category',
    'Reference',
    'Paid',
  ])
  for (const r of results) {
    csv += csvRow([
      r.date,
      r.type,
      r.counterparty,
      r.description,
      r.amount,
      r.gst_status,
      r.gst_amount,
      r.category,
      r.reference,
      r.type === 'income' ? (r.paid ? 'Yes' : 'No') : '',
    ])
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tdg-ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
