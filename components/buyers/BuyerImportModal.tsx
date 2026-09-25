'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react'
import { downloadCSV, convertToCSV } from '@/lib/export'
import { toast } from 'sonner'

type Props = {
  onClose: () => void
  onSuccess?: () => void
}

type ParsedBuyer = {
  company_name: string
  contact_name: string
  email: string
  phone: string
  country: string
  pipeline_stage: string
  tier: string
  notes: string
}

function parseCSVLine(text: string, delimiter: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim())
      cur = ''
    } else {
      cur += char
    }
  }
  result.push(cur.trim())
  return result
}

function parseCSVContent(content: string): ParsedBuyer[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) return []

  // Detect delimiter (; or ,)
  const firstLine = lines[0]
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const delimiter = semicolonCount > commaCount ? ';' : ','

  const headers = parseCSVLine(firstLine, delimiter).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''))

  // Column index resolvers
  const getCol = (patterns: string[]): number => {
    return headers.findIndex((h) => patterns.some((p) => h.includes(p)))
  }

  const colCompany = getCol(['company', 'perusahaan', 'boxname', 'nama', 'name'])
  const colContact = getCol(['contact', 'pic', 'kontak', 'person'])
  const colEmail = getCol(['email', 'mail'])
  const colPhone = getCol(['phone', 'telepon', 'telp', 'wa', 'hp'])
  const colCountry = getCol(['country', 'wilayah', 'kota', 'region', 'city', 'alamat'])
  const colStage = getCol(['stage', 'tahap', 'status', 'pipeline'])
  const colTier = getCol(['tier', 'level', 'volume'])
  const colNotes = getCol(['notes', 'catatan', 'keterangan'])

  const results: ParsedBuyer[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], delimiter)
    const company = colCompany !== -1 ? cols[colCompany] || '' : ''
    const email = colEmail !== -1 ? cols[colEmail] || '' : ''

    if (!company && !email) continue

    results.push({
      company_name: company,
      contact_name: colContact !== -1 ? cols[colContact] || '' : '',
      email: email,
      phone: colPhone !== -1 ? cols[colPhone] || '' : '',
      country: colCountry !== -1 ? cols[colCountry] || 'Indonesia' : 'Indonesia',
      pipeline_stage: colStage !== -1 ? cols[colStage] || 'lead' : 'lead',
      tier: colTier !== -1 ? cols[colTier] || 'tier_1' : 'tier_1',
      notes: colNotes !== -1 ? cols[colNotes] || '' : '',
    })
  }

  return results
}

export function BuyerImportModal({ onClose, onSuccess }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [parsedRows, setParsedRows] = useState<ParsedBuyer[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [mode, setMode] = useState<'upsert' | 'skip_duplicates'>('upsert')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // 1. Download Standard CSV Template
  function handleDownloadTemplate() {
    const templateHeaders = [
      { key: 'company_name', label: 'Nama Perusahaan' },
      { key: 'contact_name', label: 'Nama Kontak (PIC)' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Telepon / WhatsApp' },
      { key: 'country', label: 'Wilayah / Kota' },
      { key: 'pipeline_stage', label: 'Tahap Pipeline (Lead / Outreach / Sample Sent / SPH Sent)' },
      { key: 'tier', label: 'Volume Tier (Tier 1 / Tier 2 / Tier 3 / Tier 4)' },
      { key: 'notes', label: 'Catatan Kebutuhan' },
    ]

    const sampleRows = [
      {
        company_name: 'PT Aerofood ACS Indonesia',
        contact_name: 'Bpk. Rahmat Santoso',
        email: 'procurement@aerofood.co.id',
        phone: '081298765432',
        country: 'Tangerang / Bandara Soetta',
        pipeline_stage: 'Outreach',
        tier: 'Tier 1: HORECA',
        notes: 'Kebutuhan catering penerbangan 300 kg/bln bal 5kg',
      },
      {
        company_name: 'Katering Sedap Rasa Prima',
        contact_name: 'Ibu Ratna',
        email: 'ratna@sedaprasa.com',
        phone: '081387654321',
        country: 'Bandung',
        pipeline_stage: 'Sample Sent',
        tier: 'Tier 2: Catering',
        notes: 'Minta kirim sampel 250g untuk menu pesta pernikahan',
      },
    ]

    downloadCSV('htrn_template_import_buyer.csv', convertToCSV(sampleRows, templateHeaders))
    toast.success('Template CSV standar berhasil diunduh.')
  }

  // 2. Read file upload
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setError('')

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (!content) {
        setError('File kosong atau tidak dapat dibaca.')
        return
      }

      try {
        const rows = parseCSVContent(content)
        if (rows.length === 0) {
          setError('Tidak ada data valid yang terdeteksi. Pastikan file memiliki baris data.')
        } else {
          setParsedRows(rows)
        }
      } catch {
        setError('Gagal membaca format CSV. Pastikan file berformat CSV standar.')
      }
    }
    reader.readAsText(file)
  }

  // 3. Submit import to API
  async function handleImportSubmit() {
    if (parsedRows.length === 0) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/buyers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyers: parsedRows,
          mode,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses import data')
      }

      toast.success(data.message || `${parsedRows.length} prospek berhasil diimpor!`)
      router.refresh()
      if (onSuccess) onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat impor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-green-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Impor Data Prospek Buyer
              </h2>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Mendukung ekspor Streak CRM, Excel, dan format CSV standar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Step 1: Download Template Helper */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
            <div>
              <p className="text-xs font-bold text-emerald-950">Belum memiliki file data terformat?</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Unduh template CSV resmi HTRN yang sudah dilengkapi contoh isian prospek B2B.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors shrink-0 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" /> Download Template CSV
            </button>
          </div>

          {/* Step 2: Upload Dropzone */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Pilih File CSV Prospek
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 hover:border-emerald-600 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-emerald-50/20 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, text/csv, text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-8 h-8 mx-auto text-gray-400 group-hover:text-emerald-700 mb-2 transition-colors" />
              {fileName ? (
                <div>
                  <p className="text-sm font-semibold text-gray-900">{fileName}</p>
                  <p className="text-xs text-emerald-700 mt-1">Klik untuk mengganti file</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Klik untuk memilih file CSV atau drag & drop ke sini
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Format: .csv (UTF-8 didukung)</p>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Preview & Options (if rows parsed) */}
          {parsedRows.length > 0 && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {parsedRows.length} Baris Terdeteksi
                  </span>
                </div>

                {/* Deduplication Mode */}
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-gray-500 font-medium">Jika data duplikat:</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as 'upsert' | 'skip_duplicates')}
                    className="px-2 py-1 border border-gray-200 rounded-lg bg-white font-medium text-gray-800 text-xs focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="upsert">Perbarui Data (Upsert)</option>
                    <option value="skip_duplicates">Lewati (Skip)</option>
                  </select>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 text-gray-500 font-semibold">
                    <tr>
                      <th className="px-3 py-2">Perusahaan</th>
                      <th className="px-3 py-2">Kontak / Email</th>
                      <th className="px-3 py-2">Wilayah</th>
                      <th className="px-3 py-2">Stage</th>
                      <th className="px-3 py-2">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[140px]">
                          {row.company_name || '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 truncate max-w-[140px]">
                          {row.contact_name ? `${row.contact_name} ` : ''}
                          {row.email ? `(${row.email})` : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{row.country || 'Indonesia'}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
                            {row.pipeline_stage}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                            {row.tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 5 && (
                <p className="text-[11px] text-gray-400 text-center">
                  Menampilkan 5 dari {parsedRows.length} prospek yang siap diproses.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-white transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={loading || parsedRows.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all disabled:opacity-50"
            style={{ backgroundColor: '#1a472a' }}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses Impor...</span>
              </>
            ) : (
              <>
                <span>Mulai Impor ({parsedRows.length} Prospek)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
