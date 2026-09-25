import { NextResponse } from 'next/server'
import { crmCorsHeaders } from '@/lib/api-auth'

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.haturan.com'
  const tdsUrl = `${appUrl}/api/pdf/spec-sheet/bawang-goreng`

  const snippets = [
    {
      id: 'snippet_sample_offer',
      title: '📦 Penawaran Sampel 250g Gratis',
      category: 'Outreach',
      text: `Halo Tim Pengadaan, salam kenal dari PT Haturan Spice Indonesia. Kami siap mengirimkan sampel gratis 250g Bawang Merah Goreng mutu industri (Grade A Renyah / Grade B Giling) dari fasilitas kami di Bogor. Spesifikasi teknis (TDS): ${tdsUrl}. Mohon konfirmasi alamat pengiriman jika berkenan.`,
    },
    {
      id: 'snippet_sph_tier1',
      title: '📄 Penawaran Tier 1 HORECA (Rp 165k Franco)',
      category: 'Pricing',
      text: `Untuk volume 100–499 kg/order, penawaran resmi Bawang Merah Goreng Crispy Flakes kami adalah Rp 165.000 / kg Franco Jabodetabek / Bandung. Kemasan bal 5 kg ganda PE dalam karton box. Pembayaran awal CBD, pengiriman 3-5 hari kerja.`,
    },
    {
      id: 'snippet_sph_tier2',
      title: '📄 Penawaran Tier 2 Katering (Rp 155k Franco)',
      category: 'Pricing',
      text: `Untuk komitmen volume 500–999 kg/order, kami memberikan tarif Tier 2 Katering di Rp 155.000 / kg Franco. Kualitas terjamin dengan proses de-oiling sentrifugal (FFA < 0.5%, kadar air < 3%).`,
    },
    {
      id: 'snippet_tds_link',
      title: '📑 Tautan Technical Data Sheet (TDS)',
      category: 'Spesifikasi',
      text: `Berikut tautan resmi Lembar Spesifikasi Teknis (TDS) Bawang Merah Goreng PT Haturan Spice Indonesia ber-KOP resmi: ${tdsUrl}`,
    },
    {
      id: 'snippet_parmin_dispatch',
      title: '🚚 Koordinasi Ekspedisi Bogor (CV Daun Mas)',
      category: 'Logistik',
      text: `Pesanan diproses langsung dari Hub Sortasi & QC Bogor (CV Daun Mas / Mas Parmin). Jadwal pengiriman rutin via armada Franco Jabodetabek atau kargo Paxel/JNE untuk pengiriman luar kota.`,
    },
  ]

  return NextResponse.json(
    { snippets },
    { headers: crmCorsHeaders(request) }
  )
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: crmCorsHeaders(request),
  })
}
