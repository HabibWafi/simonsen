/** Quote CSV syntax and keep untrusted text from becoming a spreadsheet formula. */
export function csvEscape(value: unknown): string {
  let text = value == null ? '' : String(value)
  if (typeof value === 'string' && (/^\s*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
