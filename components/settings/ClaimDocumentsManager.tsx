'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Upload,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Download,
  Building2,
  Copy,
  Check,
} from 'lucide-react'
import type { ClaimDocument, Item, Supplier } from '@/types'

type Props = {
  initialDocuments: ClaimDocument[]
  items: Item[]
  suppliers: Supplier[]
}

const DOC_TYPE_LABELS: Record<string, { label: string; badge: string }> = {
  halal_declaration: {
    label: 'Jaminan Halal',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  spec_sheet: {
    label: 'Spec Sheet / TDS',
    badge: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  coa: {
    label: 'COA / Lab Report',
    badge: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  custom: {
    label: 'Dokumen Lain',
    badge: 'bg-gray-50 text-gray-800 border-gray-200',
  },
}

export function ClaimDocumentsManager({ initialDocuments, items, suppliers }: Props) {
  const router = useRouter()
  const [documents, setDocuments] = useState<ClaimDocument[]>(initialDocuments)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // New doc modal/form
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    item_id: items[0]?.id || '',
    doc_type: 'halal_declaration' as ClaimDocument['doc_type'],
    title: '',
    description: '',
    supplier_id: suppliers.find((s) => s.name.toLowerCase().includes('daun mas'))?.id || '',
    is_active: false,
    is_verified: false,
    generated_route: '',
    notes: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeUploadDocId, setActiveUploadDocId] = useState<string | null>(null)

  // Verification modal state
  const [verifyModalDoc, setVerifyModalDoc] = useState<ClaimDocument | null>(null)
  const [directorPin, setDirectorPin] = useState('')
  const [verifyNotes, setVerifyNotes] = useState('')
  const [verifying, setVerifying] = useState(false)

  function showNotification(msg: string, isError = false) {
    if (isError) {
      setError(msg)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(msg)
      setTimeout(() => setSuccess(null), 4000)
    }
  }

  // Toggle active/shareable status (Enforce: cannot be active if not verified)
  async function handleToggleActive(doc: ClaimDocument) {
    if (!doc.is_verified && !doc.is_active) {
      showNotification(
        'Dokumen wajib diverifikasi fisik dengan supplier terlebih dahulu sebelum akses publik dapat diaktifkan.',
        true
      )
      return
    }

    setSavingId(doc.id)
    const newActive = !doc.is_active
    const supabase = createClient()

    const { error: err } = await supabase
      .from('claim_documents')
      .update({ is_active: newActive, updated_at: new Date().toISOString() })
      .eq('id', doc.id)

    if (err) {
      showNotification(`Gagal update status share: ${err.message}`, true)
    } else {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, is_active: newActive } : d))
      )
      showNotification(
        newActive
          ? `Dokumen "${doc.title}" diaktifkan untuk publik/buyer.`
          : `Dokumen "${doc.title}" dinonaktifkan dari publik.`
      )
      router.refresh()
    }
    setSavingId(null)
  }

  // Confirm verification with Director PIN via server-side API
  async function handleConfirmVerification(e: React.FormEvent) {
    e.preventDefault()
    if (!verifyModalDoc) return
    if (!directorPin) {
      showNotification('PIN Direktur wajib diisi untuk otorisasi verifikasi dokumen.', true)
      return
    }

    setVerifying(true)
    try {
      const res = await fetch('/api/claim-documents/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: verifyModalDoc.id,
          is_verified: true,
          director_pin: directorPin,
          notes: verifyNotes,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        showNotification(data.error || 'Verifikasi dokumen gagal', true)
        setVerifying(false)
        return
      }

      setDocuments((prev) =>
        prev.map((d) => (d.id === verifyModalDoc.id ? (data.document as ClaimDocument) : d))
      )
      setVerifyModalDoc(null)
      setDirectorPin('')
      showNotification('Dokumen berhasil diverifikasi sah dengan otorisasi Direktur!')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error'
      showNotification(`Gagal verifikasi: ${msg}`, true)
    } finally {
      setVerifying(false)
    }
  }

  // Revoke verification via server-side API
  async function handleRevokeVerification(doc: ClaimDocument) {
    if (
      !confirm(
        `Tarik status verifikasi untuk "${doc.title}"? Akses publik otomatis akan dinonaktifkan demi integritas klaim.`
      )
    ) {
      return
    }
    setSavingId(doc.id)
    try {
      const res = await fetch('/api/claim-documents/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: doc.id,
          is_verified: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showNotification(data.error || 'Gagal mencabut verifikasi', true)
      } else {
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? (data.document as ClaimDocument) : d))
        )
        showNotification('Verifikasi dicabut kembali menjadi Draft dan akses publik ditutup.')
        router.refresh()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error'
      showNotification(`Gagal: ${msg}`, true)
    } finally {
      setSavingId(null)
    }
  }

  // Update supplier assigned
  async function handleUpdateSupplier(docId: string, supplierId: string) {
    setSavingId(docId)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('claim_documents')
      .update({ supplier_id: supplierId || null, updated_at: new Date().toISOString() })
      .eq('id', docId)

    if (err) {
      showNotification(`Gagal update supplier: ${err.message}`, true)
    } else {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                supplier_id: supplierId || null,
                supplier: suppliers.find((s) => s.id === supplierId) || null,
              }
            : d
        )
      )
      showNotification('Supplier berhasil diperbarui.')
      router.refresh()
    }
    setSavingId(null)
  }

  // Trigger file upload for a document
  function triggerUpload(docId: string) {
    setActiveUploadDocId(docId)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  // Handle uploaded file (supporting PDF/JPG from Daun Mas)
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeUploadDocId) return

    setUploadingId(activeUploadDocId)
    const supabase = createClient()
    const doc = documents.find((d) => d.id === activeUploadDocId)
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const storagePath = `claim-docs/${fileName}`

    // Upload strictly to private 'claim-documents' bucket (NEVER fallback to public bucket)
    const { error: uploadErr } = await supabase.storage
      .from('claim-documents')
      .upload(storagePath, file, { upsert: true })

    if (uploadErr) {
      showNotification(`Gagal upload berkas ke storage privat: ${uploadErr.message}`, true)
      setUploadingId(null)
      return
    }

    // Relative storage reference in private bucket (accessed exclusively via /api/claim-documents/[id]/file)
    const fileReference = `claim-documents/${storagePath}`

    // Update document record with file URL and name
    const updatePayload = {
      supporting_file_url: fileReference,
      supporting_file_name: file.name,
      updated_at: new Date().toISOString(),
    }

    const { error: dbErr } = await supabase
      .from('claim_documents')
      .update(updatePayload)
      .eq('id', activeUploadDocId)

    if (dbErr) {
      showNotification(`Gagal simpan link file: ${dbErr.message}`, true)
    } else {
      setDocuments((prev) =>
        prev.map((d) => (d.id === activeUploadDocId ? { ...d, ...updatePayload } : d))
      )
      showNotification(`File bukti fisik "${file.name}" berhasil diupload untuk ${doc?.title}.`)
      router.refresh()
    }
    setUploadingId(null)
    setActiveUploadDocId(null)
  }

  // Delete document
  async function handleDelete(docId: string, title: string) {
    if (!confirm(`Hapus dokumen klaim "${title}"?`)) return
    setSavingId(docId)
    const supabase = createClient()
    const { error: err } = await supabase.from('claim_documents').delete().eq('id', docId)

    if (err) {
      showNotification(`Gagal menghapus: ${err.message}`, true)
    } else {
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
      showNotification(`Dokumen "${title}" telah dihapus.`)
      router.refresh()
    }
    setSavingId(null)
  }

  // Add new document
  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.title) {
      showNotification('Judul dokumen wajib diisi.', true)
      return
    }

    const supabase = createClient()
    const payload = {
      ...addForm,
      supplier_id: addForm.supplier_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error: err } = await supabase
      .from('claim_documents')
      .insert(payload)
      .select('*, items(*), suppliers(*)')
      .single()

    if (err) {
      showNotification(`Gagal menambah dokumen: ${err.message}`, true)
    } else {
      setDocuments((prev) => [data as ClaimDocument, ...prev])
      setShowAddModal(false)
      showNotification(`Dokumen klaim baru "${addForm.title}" berhasil ditambahkan.`)
      router.refresh()
    }
  }

  // Copy share URL
  function handleCopyLink(routeOrUrl: string, id: string) {
    const fullUrl = routeOrUrl.startsWith('http')
      ? routeOrUrl
      : `${window.location.origin}${routeOrUrl}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
    showNotification('Tautan dokumen berhasil disalin ke clipboard!')
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 text-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="font-semibold text-amber-900">
              Protokol Integritas Klaim Mutu & Otorisasi Verifikasi
            </h3>
            <p className="text-amber-800/90 text-xs leading-relaxed">
              Dokumen klaim (Jaminan Halal, TDS, COA) menyatakan komitmen mutu resmi ke pembeli industri.
              Demi kepatuhan hukum dan mencegah overclaim, dokumen wajib diverifikasi fisik dengan supplier
              (seperti <strong>CV Daun Mas / Mas Parmin</strong>) dan disahkan dengan PIN Direktur sebelum
              akses publik dapat dibuka. Dokumen yang belum diverifikasi terkunci dari akses publik.
            </p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Daftar Dokumen Mutu & Klaim</h2>
          <p className="text-xs text-gray-500">
            Total {documents.length} dokumen klaim terdaftar
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-95"
          style={{ backgroundColor: '#1a472a' }}
        >
          <Plus className="w-4 h-4" />
          Tambah Dokumen Klaim
        </button>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {documents.map((doc) => {
          const typeBadge = DOC_TYPE_LABELS[doc.doc_type] || DOC_TYPE_LABELS.custom
          const itemName = items.find((i) => i.id === doc.item_id)?.name || 'Semua Produk'
          const shareUrl = doc.is_verified
            ? doc.generated_route || (doc.supporting_file_url ? `/api/claim-documents/${doc.id}/file` : '')
            : ''

          return (
            <div
              key={doc.id}
              className={`bg-white rounded-2xl border transition-all ${
                doc.is_active ? 'border-gray-200 shadow-sm' : 'border-gray-200 bg-gray-50/50 opacity-80'
              } p-5 space-y-4`}
            >
              {/* Row 1: Badges, Title, and Action Toggles */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${typeBadge.badge}`}
                    >
                      {typeBadge.label}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                      {itemName}
                    </span>
                    {doc.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Terverifikasi Supplier
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Draft (Belum Diverifikasi)
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
                      {doc.description}
                    </p>
                  )}
                </div>

                {/* Right: Master Toggles */}
                <div className="flex items-center gap-4 shrink-0 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  {/* Share Active Toggle */}
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-gray-700">Akses Publik</div>
                    <div className="text-[10px] text-gray-400">
                      {!doc.is_verified
                        ? 'Wajib Verifikasi'
                        : doc.is_active
                        ? 'Siap Dibagikan'
                        : 'Terkunci'}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={doc.is_active}
                    disabled={savingId === doc.id || !doc.is_verified}
                    onClick={() => handleToggleActive(doc)}
                    title={
                      !doc.is_verified
                        ? 'Verifikasi fisik dokumen terlebih dahulu untuk membuka akses publik'
                        : 'Toggle izin sharing'
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      !doc.is_verified
                        ? 'bg-gray-200 cursor-not-allowed opacity-60'
                        : doc.is_active
                        ? 'bg-emerald-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        doc.is_active && doc.is_verified ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Row 2: Supplier Mapping & Verification Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
                {/* Supplier selection */}
                <div className="flex items-center gap-2 bg-gray-50/70 p-2.5 rounded-xl border border-gray-200/60">
                  <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-gray-400 block font-medium">
                      Mitra Supplier / Pengolah:
                    </span>
                    <select
                      value={doc.supplier_id || ''}
                      onChange={(e) => handleUpdateSupplier(doc.id, e.target.value)}
                      className="w-full bg-transparent font-semibold text-gray-800 focus:outline-none text-xs"
                    >
                      <option value="">Pilih Supplier...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.region ? `(${s.region})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Verification Action */}
                <div className="flex items-center justify-between gap-2 bg-gray-50/70 p-2.5 rounded-xl border border-gray-200/60">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">
                      Status Kesesuaian Fisik:
                    </span>
                    <span className="font-semibold text-gray-800">
                      {doc.is_verified
                        ? `Diverifikasi: ${doc.verified_by || 'Staff'} (${
                            doc.verified_at
                              ? new Date(doc.verified_at).toLocaleDateString('id-ID')
                              : '-'
                          })`
                        : 'Belum dicek langsung'}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      doc.is_verified
                        ? handleRevokeVerification(doc)
                        : setVerifyModalDoc(doc)
                    }
                    disabled={savingId === doc.id || verifying}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      doc.is_verified
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-emerald-700 text-white hover:bg-emerald-800'
                    }`}
                  >
                    {doc.is_verified ? 'Tarik Verifikasi' : 'Sahkan Verifikasi ✓'}
                  </button>
                </div>
              </div>

              {/* Row 3: Supporting File (Scan from Daun Mas) & Live Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                {/* Physical Scan File */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">Bukti Fisik Supplier:</span>
                  {doc.supporting_file_url ? (
                    <a
                      href={`/api/claim-documents/${doc.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold hover:bg-emerald-100"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {doc.supporting_file_name || 'Download Scan Bukti (PDF/JPG)'}
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">Belum ada scan terunggah</span>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerUpload(doc.id)}
                    disabled={uploadingId === doc.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium"
                  >
                    <Upload className="w-3 h-3" />
                    {uploadingId === doc.id ? 'Mengunggah...' : 'Upload Scan'}
                  </button>
                </div>

                {/* Right: Preview & Share */}
                <div className="flex items-center gap-2 justify-end">
                  {shareUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(shareUrl, doc.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs"
                        title="Salin Tautan Dokumen"
                      >
                        {copiedId === doc.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Salin Link
                          </>
                        )}
                      </button>
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 font-semibold text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Preview Dokumen
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Hapus Dokumen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notes */}
              {doc.notes && (
                <div className="text-[11px] text-gray-500 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 flex items-start gap-2">
                  <span className="font-semibold text-gray-600 shrink-0">Catatan QC:</span>
                  <span>{doc.notes}</span>
                </div>
              )}
            </div>
          )
        })}

        {documents.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 p-8 space-y-3">
            <FileCheck className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="text-sm font-semibold text-gray-700">Belum ada Dokumen Klaim</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Tambahkan surat jaminan halal, spesifikasi teknis, atau COA untuk produk komoditas.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ backgroundColor: '#1a472a' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Modal Add Document */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Tambah Dokumen Klaim Mutu</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Produk Terkait</label>
                <select
                  value={addForm.item_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, item_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Tipe Dokumen</label>
                  <select
                    value={addForm.doc_type}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        doc_type: e.target.value as ClaimDocument['doc_type'],
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 p-2 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  >
                    <option value="halal_declaration">Jaminan Halal</option>
                    <option value="spec_sheet">Technical Data Sheet (TDS)</option>
                    <option value="coa">COA / Lab Test</option>
                    <option value="custom">Dokumen Khusus</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Supplier Terkait</label>
                  <select
                    value={addForm.supplier_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, supplier_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 p-2 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  >
                    <option value="">Pilih Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Judul Dokumen *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sertifikat Analisis Laboratorium Batch Sept 2026"
                  value={addForm.title}
                  onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan ruang lingkup dokumen..."
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Route Dokumen (Jika di-generate sistem)
                </label>
                <input
                  type="text"
                  placeholder="/api/pdf/spec-sheet/bawang-goreng"
                  value={addForm.generated_route}
                  onChange={(e) => setAddForm((f) => ({ ...f, generated_route: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2 focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Catatan Tambahan / QC</label>
                <textarea
                  rows={2}
                  placeholder="Catatan verifikasi atau kecocokan supplier..."
                  value={addForm.notes}
                  onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.is_verified}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setAddForm((f) => ({
                        ...f,
                        is_verified: checked,
                        is_active: checked ? f.is_active : false,
                      }))
                    }}
                    className="rounded text-emerald-700 focus:ring-emerald-700"
                  />
                  <span>Sudah Terverifikasi Fisik</span>
                </label>
                <label
                  className={`flex items-center gap-2 ${
                    !addForm.is_verified ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!addForm.is_verified}
                    checked={addForm.is_active}
                    onChange={(e) => setAddForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="rounded text-emerald-700 focus:ring-emerald-700"
                  />
                  <span>Aktifkan untuk Dibagikan (Wajib Verified)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-white font-semibold"
                  style={{ backgroundColor: '#1a472a' }}
                >
                  Simpan Dokumen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal PIN Verification */}
      {verifyModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-800" />
                <h3 className="text-base font-bold text-gray-900">Otorisasi Verifikasi Dokumen</h3>
              </div>
              <button
                onClick={() => setVerifyModalDoc(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmVerification} className="space-y-4 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1">
                <div className="text-[10px] text-gray-500 font-semibold uppercase">Dokumen Target:</div>
                <div className="font-bold text-gray-900 text-sm">{verifyModalDoc.title}</div>
                <div className="text-[11px] text-gray-600">
                  Mitra Pengolah:{' '}
                  <strong>
                    {suppliers.find((s) => s.id === verifyModalDoc.supplier_id)?.name || 'CV Daun Mas'}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-800 mb-1">
                  PIN Keamanan Direktur *
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="Masukkan 6 digit PIN Direktur"
                  value={directorPin}
                  onChange={(e) => setDirectorPin(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-center font-mono tracking-widest text-base focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  autoFocus
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Verifikasi dokumen resmi mengikat tanggung jawab mutu ke pembeli industri dan diaudit oleh sistem.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-800 mb-1">
                  Catatan Verifikasi / Bukti Fisik
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Bukti sertifikasi fisik diperiksa langsung di fasilitas Bogor."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setVerifyModalDoc(null)}
                  disabled={verifying}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-1.5"
                  style={{ backgroundColor: '#1a472a' }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {verifying ? 'Memvalidasi...' : 'Sahkan & Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
