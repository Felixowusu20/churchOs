/** Client-side report builders — CSV download + printable HTML. */

export type CsvRow = Record<string, string | number | boolean | null | undefined>

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const headers = rows.length
    ? Array.from(rows.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k))
        return set
      }, new Set<string>()))
    : ['message']

  const escape = (value: unknown) => {
    const s = value == null ? '' : String(value)
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const lines = [
    headers.join(','),
    ...(rows.length
      ? rows.map((row) => headers.map((h) => escape(row[h])).join(','))
      : ['No data for this report']),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function openPrintableReport(title: string, htmlBody: string) {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) return false

  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; padding: 32px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 28px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    p.meta { color: #666; font-size: 12px; margin: 0 0 24px; font-family: system-ui, sans-serif; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: system-ui, sans-serif; margin-bottom: 16px; }
    th, td { border: 1px solid #e5e5e5; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; font-weight: 600; }
    .kpi { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 16px 0 24px; }
    .kpi div { border: 1px solid #e5e5e5; padding: 12px; border-radius: 6px; }
    .kpi strong { display: block; font-size: 18px; margin-top: 4px; }
    .muted { color: #777; font-size: 11px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Generated ${new Date().toLocaleString()} · ChurchOS</p>
  ${htmlBody}
  <script>window.onload = function () { window.focus(); window.print(); }</script>
</body>
</html>`)
  win.document.close()
  return true
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function tableHtml(headers: string[], rows: Array<Array<string | number>>) {
  if (!rows.length) return '<p class="muted">No rows for this period.</p>'
  return `<table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>`
}

export function kpiHtml(items: Array<{ label: string; value: string }>) {
  return `<div class="kpi">${items
    .map((i) => `<div><span class="muted">${escapeHtml(i.label)}</span><strong>${escapeHtml(i.value)}</strong></div>`)
    .join('')}</div>`
}

export type DateRange = { start: string; end: string }

export function inDateRange(iso: string, range: DateRange) {
  if (!iso) return false
  const day = iso.slice(0, 10)
  if (range.start && day < range.start) return false
  if (range.end && day > range.end) return false
  return true
}

export function defaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 5)
  start.setDate(1)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function rangeLabel(range: DateRange) {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  if (!range.start && !range.end) return 'All time'
  if (range.start && range.end) return `${fmt(range.start)} – ${fmt(range.end)}`
  if (range.start) return `From ${fmt(range.start)}`
  return `Through ${fmt(range.end)}`
}
