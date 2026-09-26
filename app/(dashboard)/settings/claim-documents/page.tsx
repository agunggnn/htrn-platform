import { createClient } from '@/lib/supabase/server'
import { ClaimDocumentsManager } from '@/components/settings/ClaimDocumentsManager'
import type { ClaimDocument, Item, Supplier } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ClaimDocumentsPage() {
  const supabase = await createClient()

  const [{ data: docsData, error: docsError }, { data: itemsData }, { data: suppliersData }] =
    await Promise.all([
      supabase.from('claim_documents').select('*, items(*), suppliers(*)').order('created_at', { ascending: false }),
      supabase.from('items').select('*').order('name'),
      supabase.from('suppliers').select('*').order('name'),
    ])

  const items = (itemsData || []) as Item[]
  const suppliers = (suppliersData || []) as Supplier[]

  let documents: ClaimDocument[] = []

  if (docsData && !docsError) {
    documents = docsData as unknown as ClaimDocument[]
  } else {
    // Graceful fallback for preview / before migration run
    const bwgItem = items.find((i) => i.name.toLowerCase().includes('bawang'))
    const daunMasSupplier = suppliers.find((s) => s.name.toLowerCase().includes('daun mas') || s.name.toLowerCase().includes('parmin'))

    documents = [
      {
        id: 'fallback-halal-1',
        item_id: bwgItem?.id || null,
        doc_type: 'halal_declaration',
        title: 'Surat Jaminan Halal & Keamanan Pangan',
        description: 'Surat pernyataan jaminan kehalalan bahan nabati, proses pengolahan, dan kemasan higienis Bawang Merah Goreng.',
        is_active: true,
        is_verified: false,
        supplier_id: daunMasSupplier?.id || null,
        generated_route: '/api/pdf/halal-declaration/bawang-goreng',
        notes: 'Sertifikat halal minyak goreng sudah ada dari CV Daun Mas. Menunggu upload scan berkas.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'fallback-spec-1',
        item_id: bwgItem?.id || null,
        doc_type: 'spec_sheet',
        title: 'Technical Data Sheet (TDS) / Spec Sheet',
        description: 'Lembar spesifikasi parameter mutu (kadar air < 3%, FFA < 0.5%), varian grade, dan tabel harga franco resmi.',
        is_active: true,
        is_verified: false,
        supplier_id: daunMasSupplier?.id || null,
        generated_route: '/api/pdf/spec-sheet/bawang-goreng',
        notes: 'Perlu sinkronisasi parameter moisture & FFA dengan CoA aktual dari Daun Mas.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'fallback-coa-1',
        item_id: bwgItem?.id || null,
        doc_type: 'coa',
        title: 'Certificate of Analysis (CoA) Lab Pangan',
        description: 'Laporan hasil uji laboratorium independen terakreditasi KAN untuk lot pengiriman industri.',
        is_active: false,
        is_verified: false,
        supplier_id: daunMasSupplier?.id || null,
        generated_route: null,
        notes: 'Fisik CoA sudah ada dari CV Daun Mas. Siap diupload ke storage.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dokumen Klaim & Mutu Pangan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Kelola hak akses sharing (toggle on/off), status verifikasi supplier (CV Daun Mas), dan arsip scan bukti fisik resmi.
        </p>
      </div>

      <ClaimDocumentsManager
        initialDocuments={documents}
        items={items}
        suppliers={suppliers}
      />
    </div>
  )
}
