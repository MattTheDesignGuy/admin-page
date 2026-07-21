// Used when ANTHROPIC_API_KEY isn't set, so the upload -> confirm -> save
// flow can be exercised locally without an API key. Never used once a real
// key is configured (production always has one set).

export function mockIncomeExtraction() {
  return {
    invoice_number: 'INV-0001',
    client: 'Sample Client Pty Ltd',
    date: new Date().toISOString().slice(0, 10),
    amount: 1100,
    gst_status: 'amount' as const,
    gst_amount: 100,
    description: 'Sample data — set ANTHROPIC_API_KEY to extract real invoices.',
  }
}

export function mockExpenseExtraction() {
  return {
    vendor: 'Sample Vendor',
    date: new Date().toISOString().slice(0, 10),
    amount: 49.99,
    currency: 'AUD',
    gst_status: 'amount' as const,
    gst_amount: 4.99,
    category: 'Software/subscriptions',
    description: 'Sample data — set ANTHROPIC_API_KEY to extract real receipts.',
  }
}
