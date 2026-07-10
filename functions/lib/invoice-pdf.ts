import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import type { LineItem } from './types'
import { lineItemAmount } from './invoice-calc'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 40

const NAVY = '#0F1A3A'
const PURPLE = '#3B1F6E'
const BRIGHT_BLUE = '#1E5BFF'
const BRIGHT_PURPLE = '#6B2FE8'
const ACCENT_BLUE = '#2A4FD9'
const INK = '#1A2333'
const MUTED = '#5C6685'
const LAVENDER = '#C9CBEA'
const ROW_ALT = '#F5F7FB'
const BORDER = '#D3D9E8'

const SELLER = {
  name: 'The Design Guy',
  address: '8 Remany Cl, Hillside VIC 3037, Australia',
  abn: '31 605 725 729',
  bsb: '923 100',
  acc: '044 621 620',
  paymentTerms: 'Payment within 7 days from PI.',
}

export interface InvoicePdfData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  reference: string | null
  billTo: {
    businessName: string
    attention: string | null
    addressLines: string[]
  }
  lineItems: LineItem[]
  deposit: number
  depositLabel: string | null
  totals: { subtotal: number; gstTotal: number; total: number; amountDue: number }
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  drawHeader(page, font, bold, data)
  const afterMeta = drawBillToAndMeta(page, font, bold, data)
  const afterTable = drawLineItemTable(page, font, bold, data, afterMeta - 20)
  const afterTotals = drawPaymentAndTotals(page, font, bold, data, afterTable - 24)
  drawPaymentAdvice(page, font, bold, data, afterTotals - 40)
  drawFooter(page, font)

  return doc.save()
}

// ---------- sections ----------

function drawHeader(page: PDFPage, font: PDFFont, bold: PDFFont, data: InvoicePdfData) {
  const bandHeight = 110
  const y = PAGE_HEIGHT - bandHeight
  drawHorizontalGradient(page, { x: 0, y, width: PAGE_WIDTH, height: bandHeight }, NAVY, PURPLE)

  // decorative translucent circles, top-right
  page.drawCircle({ x: PAGE_WIDTH - 40, y: PAGE_HEIGHT - 20, size: 60, color: rgb(1, 1, 1), opacity: 0.05 })
  page.drawCircle({ x: PAGE_WIDTH - 110, y: PAGE_HEIGHT - 60, size: 36, color: rgb(1, 1, 1), opacity: 0.04 })

  // logo badge (vector placeholder — see plan note on raster logo)
  const badgeCenter = { x: MARGIN + 26, y: PAGE_HEIGHT - 55 }
  page.drawCircle({ x: badgeCenter.x, y: badgeCenter.y, size: 26, color: hex(BRIGHT_PURPLE) })
  page.drawText('TDG', {
    x: badgeCenter.x - 13,
    y: badgeCenter.y - 4,
    size: 9,
    font: bold,
    color: rgb(1, 1, 1),
  })

  const textX = MARGIN + 66
  page.drawText(SELLER.name, { x: textX, y: PAGE_HEIGHT - 44, size: 17, font: bold, color: rgb(1, 1, 1) })
  page.drawText(SELLER.address, { x: textX, y: PAGE_HEIGHT - 60, size: 9, font, color: hex(LAVENDER) })
  page.drawText(`ABN ${SELLER.abn}`, { x: textX, y: PAGE_HEIGHT - 73, size: 9, font, color: hex(LAVENDER) })

  const title = 'TAX INVOICE'
  const titleSize = 20
  const titleWidth = bold.widthOfTextAtSize(title, titleSize)
  page.drawText(title, {
    x: PAGE_WIDTH - MARGIN - titleWidth,
    y: PAGE_HEIGHT - 55,
    size: titleSize,
    font: bold,
    color: rgb(1, 1, 1),
  })
}

function drawBillToAndMeta(page: PDFPage, font: PDFFont, bold: PDFFont, data: InvoicePdfData): number {
  let top = PAGE_HEIGHT - 110 - 36

  // Left: bill-to block
  let leftY = top
  page.drawText(data.billTo.businessName, { x: MARGIN, y: leftY, size: 13, font: bold, color: hex(INK) })
  leftY -= 16
  if (data.billTo.attention) {
    page.drawText(`ATT: ${data.billTo.attention}`, { x: MARGIN, y: leftY, size: 10, font, color: hex(MUTED) })
    leftY -= 14
  }
  for (const line of data.billTo.addressLines) {
    page.drawText(line, { x: MARGIN, y: leftY, size: 10, font, color: hex(MUTED) })
    leftY -= 13
  }

  // Right: metadata rows
  const metaX = PAGE_WIDTH - MARGIN - 190
  const valueX = PAGE_WIDTH - MARGIN
  let metaY = top
  const rows: Array<[string, string]> = [
    ['Invoice Number', data.invoiceNumber],
    ['Invoice Date', formatDate(data.invoiceDate)],
  ]
  if (data.reference) rows.push(['Reference', data.reference])
  rows.push(['Due Date', formatDate(data.dueDate)])

  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x: metaX, y: metaY, size: 8, font: bold, color: hex(ACCENT_BLUE) })
    const valueWidth = font.widthOfTextAtSize(value, 10)
    page.drawText(value, { x: valueX - valueWidth, y: metaY, size: 10, font, color: hex(INK) })
    metaY -= 16
  }

  return Math.min(leftY, metaY)
}

interface TableRow {
  description: string
  qty: string
  unitPrice: string
  gst: string
  amount: string
  isDeposit?: boolean
}

function drawLineItemTable(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  data: InvoicePdfData,
  startY: number,
): number {
  const colX = { description: MARGIN, qty: MARGIN + 250, unitPrice: MARGIN + 300, gst: MARGIN + 370, amount: MARGIN + 435 }
  const tableWidth = PAGE_WIDTH - MARGIN * 2
  const descriptionWidth = colX.qty - colX.description - 8
  const headerHeight = 24
  const lineHeight = 12
  const rowPadding = 8

  const rows: TableRow[] = data.lineItems.map((item) => ({
    description: item.description,
    qty: String(item.qty),
    unitPrice: formatCurrency(item.unit_price),
    gst: item.gst === 'Free' ? 'Free' : formatCurrency(item.gst),
    amount: formatCurrency(lineItemAmount(item)),
  }))
  if (data.deposit > 0) {
    rows.push({
      description: data.depositLabel ?? 'Less: Deposit received.',
      qty: '',
      unitPrice: '',
      gst: '',
      amount: formatCurrency(-data.deposit),
      isDeposit: true,
    })
  }

  // header row
  page.drawRectangle({ x: MARGIN, y: startY - headerHeight, width: tableWidth, height: headerHeight, color: hex(NAVY) })
  const headerY = startY - headerHeight + 8
  page.drawText('DESCRIPTION', { x: colX.description + 4, y: headerY, size: 8, font: bold, color: rgb(1, 1, 1) })
  page.drawText('QTY', { x: colX.qty, y: headerY, size: 8, font: bold, color: rgb(1, 1, 1) })
  page.drawText('UNIT PRICE', { x: colX.unitPrice, y: headerY, size: 8, font: bold, color: rgb(1, 1, 1) })
  page.drawText('GST', { x: colX.gst, y: headerY, size: 8, font: bold, color: rgb(1, 1, 1) })
  page.drawText('AMOUNT AUD', { x: colX.amount, y: headerY, size: 8, font: bold, color: rgb(1, 1, 1) })

  let y = startY - headerHeight
  rows.forEach((row, i) => {
    const wrapped = wrapText(row.description, font, 9.5, descriptionWidth)
    const rowHeight = Math.max(wrapped.length * lineHeight + rowPadding, 24)

    if (i % 2 === 1) {
      page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: tableWidth, height: rowHeight, color: hex(ROW_ALT) })
    }

    const textTop = y - rowPadding / 2 - 8
    wrapped.forEach((line, li) => {
      page.drawText(line, {
        x: colX.description + 4,
        y: textTop - li * lineHeight,
        size: 9.5,
        font: row.isDeposit ? bold : font,
        color: hex(INK),
      })
    })
    if (!row.isDeposit) {
      page.drawText(row.qty, { x: colX.qty, y: textTop, size: 9.5, font, color: hex(INK) })
      page.drawText(row.unitPrice, { x: colX.unitPrice, y: textTop, size: 9.5, font, color: hex(INK) })
      page.drawText(row.gst, { x: colX.gst, y: textTop, size: 9.5, font, color: hex(INK) })
    }
    const amountWidth = font.widthOfTextAtSize(row.amount, 9.5)
    page.drawText(row.amount, {
      x: PAGE_WIDTH - MARGIN - amountWidth,
      y: textTop,
      size: 9.5,
      font: row.isDeposit ? bold : font,
      color: hex(INK),
    })

    y -= rowHeight
  })

  page.drawRectangle({
    x: MARGIN,
    y,
    width: tableWidth,
    height: startY - y,
    borderColor: hex(BORDER),
    borderWidth: 0.75,
  })

  return y
}

function drawPaymentAndTotals(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  data: InvoicePdfData,
  startY: number,
): number {
  const boxWidth = 240
  const boxHeight = 80
  page.drawRectangle({ x: MARGIN, y: startY - boxHeight, width: boxWidth, height: boxHeight, color: hex(ROW_ALT) })
  let py = startY - 18
  page.drawText('Payment Details', { x: MARGIN + 12, y: py, size: 10, font: bold, color: hex(INK) })
  py -= 16
  page.drawText(`BSB: ${SELLER.bsb}    ACC: ${SELLER.acc}`, { x: MARGIN + 12, y: py, size: 9, font, color: hex(MUTED) })
  py -= 14
  page.drawText(SELLER.paymentTerms, { x: MARGIN + 12, y: py, size: 9, font, color: hex(MUTED) })

  const rightX = PAGE_WIDTH - MARGIN
  let ry = startY - 16
  ry = drawTotalRow(page, font, 'Subtotal', formatCurrency(data.totals.subtotal), rightX, ry)
  const gstLabel = data.totals.gstTotal === 0 ? 'Total GST Free' : 'Total GST'
  ry = drawTotalRow(page, font, gstLabel, formatCurrency(data.totals.gstTotal), rightX, ry)

  ry -= 6
  const barHeight = 28
  const barWidth = 220
  const barX = rightX - barWidth
  drawHorizontalGradient(page, { x: barX, y: ry - barHeight, width: barWidth, height: barHeight }, BRIGHT_BLUE, BRIGHT_PURPLE)
  page.drawText('TOTAL AUD', { x: barX + 10, y: ry - barHeight + 9, size: 10, font: bold, color: rgb(1, 1, 1) })
  const totalText = formatCurrency(data.totals.total)
  const totalWidth = bold.widthOfTextAtSize(totalText, 12)
  page.drawText(totalText, { x: rightX - 10 - totalWidth, y: ry - barHeight + 9, size: 12, font: bold, color: rgb(1, 1, 1) })
  ry -= barHeight + 12

  const dueText = formatCurrency(data.totals.amountDue)
  const dueWidth = bold.widthOfTextAtSize(dueText, 12)
  page.drawText('Amount Due', { x: barX + 10, y: ry, size: 10, font: bold, color: hex(INK) })
  page.drawText(dueText, { x: rightX - dueWidth, y: ry, size: 12, font: bold, color: hex(ACCENT_BLUE) })

  return Math.min(startY - boxHeight, ry - 10)
}

function drawTotalRow(page: PDFPage, font: PDFFont, label: string, value: string, rightX: number, y: number): number {
  page.drawText(label, { x: rightX - 220, y, size: 10, font, color: hex(MUTED) })
  const valueWidth = font.widthOfTextAtSize(value, 10)
  page.drawText(value, { x: rightX - valueWidth, y, size: 10, font, color: hex(INK) })
  return y - 16
}

function drawPaymentAdvice(page: PDFPage, font: PDFFont, bold: PDFFont, data: InvoicePdfData, y: number) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.75,
    color: hex(BORDER),
    dashArray: [4, 3],
  })

  const labelY = y - 20
  const valueY = y - 34
  const colWidth = (PAGE_WIDTH - MARGIN * 2) / 3

  const col = (i: number) => MARGIN + i * colWidth

  page.drawText('TO', { x: col(0), y: labelY, size: 8, font: bold, color: hex(ACCENT_BLUE) })
  page.drawText(SELLER.name, { x: col(0), y: valueY, size: 9.5, font, color: hex(INK) })
  page.drawText(SELLER.address, { x: col(0), y: valueY - 12, size: 8, font, color: hex(MUTED) })

  page.drawText('CUSTOMER / AMOUNT DUE', { x: col(1), y: labelY, size: 8, font: bold, color: hex(ACCENT_BLUE) })
  page.drawText(data.billTo.businessName, { x: col(1), y: valueY, size: 9.5, font, color: hex(INK) })
  page.drawText(formatCurrency(data.totals.amountDue), { x: col(1), y: valueY - 12, size: 9.5, font: bold, color: hex(INK) })

  page.drawText('INVOICE NUMBER / DUE DATE', { x: col(2), y: labelY, size: 8, font: bold, color: hex(ACCENT_BLUE) })
  page.drawText(data.invoiceNumber, { x: col(2), y: valueY, size: 9.5, font, color: hex(INK) })
  page.drawText(formatDate(data.dueDate), { x: col(2), y: valueY - 12, size: 9.5, font, color: hex(INK) })
}

function drawFooter(page: PDFPage, font: PDFFont) {
  const bandHeight = 24
  drawHorizontalGradient(page, { x: 0, y: 0, width: PAGE_WIDTH, height: bandHeight }, NAVY, PURPLE)
  const text = `${SELLER.name} • ABN ${SELLER.abn} • ${SELLER.address}`
  const size = 7.5
  const width = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: (PAGE_WIDTH - width) / 2, y: 9, size, font, color: hex(LAVENDER) })
}

// ---------- drawing helpers ----------

function drawHorizontalGradient(
  page: PDFPage,
  rect: { x: number; y: number; width: number; height: number },
  startHex: string,
  endHex: string,
) {
  const strips = 80
  const stripWidth = rect.width / strips
  const start = hexToComponents(startHex)
  const end = hexToComponents(endHex)
  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1)
    const color = rgb(lerp(start.r, end.r, t), lerp(start.g, end.g, t), lerp(start.b, end.b, t))
    page.drawRectangle({
      x: rect.x + i * stripWidth,
      y: rect.y,
      // slight overlap to avoid visible seams between strips
      width: stripWidth + 0.75,
      height: rect.height,
      color,
    })
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = words[0]
  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = words[i]
    }
  }
  lines.push(current)
  return lines
}

function formatCurrency(value: number): string {
  const negative = value < 0
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${negative ? '-' : ''}${formatted}`
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${day} ${months[month - 1]} ${year}`
}

function hex(value: string): RGB {
  const c = hexToComponents(value)
  return rgb(c.r, c.g, c.b)
}

function hexToComponents(value: string): { r: number; g: number; b: number } {
  const clean = value.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
