export function csvRow(fields: Array<string | number | null>): string {
  return fields.map(csvEscape).join(',') + '\r\n'
}

function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
