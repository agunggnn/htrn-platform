/**
 * Utility functions for exporting data to CSV format
 */

export type CSVHeader = {
  key: string
  label: string
}

/**
 * Convert array of objects to CSV string format
 */
export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers?: CSVHeader[]
): string {
  if (!data || data.length === 0) {
    return ''
  }

  const keys = headers ? headers.map((h) => h.key) : Object.keys(data[0])
  const headerRow = headers
    ? headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',')
    : keys.map((k) => `"${k.replace(/"/g, '""')}"`).join(',')

  const rows = data.map((item) =>
    keys
      .map((key) => {
        const val = item[key]
        if (val === null || val === undefined) return '""'
        if (typeof val === 'object') {
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`
        }
        return `"${String(val).replace(/"/g, '""')}"`
      })
      .join(',')
  )

  return [headerRow, ...rows].join('\r\n')
}

/**
 * Trigger client-side file download for generated CSV
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
