import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type ExportColumn = {
  header: string
  accessor: (row: Record<string, unknown>) => string | number
}

export function exportExcel(filename: string, columns: ExportColumn[], rows: Record<string, unknown>[]) {
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.header, c.accessor(row)])),
  )
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportPdf(title: string, subtitle: string, columns: ExportColumn[], rows: Record<string, unknown>[], filename: string) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(title, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(subtitle, 14, 24)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 30,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(c.accessor(row)))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [81, 69, 157] },
  })

  doc.save(`${filename}.pdf`)
}

export function downloadCsv(filename: string, columns: ExportColumn[], rows: Record<string, unknown>[]) {
  const headers = columns.map((c) => c.header)
  const body = rows.map((row) => columns.map((c) => `"${String(c.accessor(row)).replace(/"/g, '""')}"`))
  const csv = [headers.join(','), ...body.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
