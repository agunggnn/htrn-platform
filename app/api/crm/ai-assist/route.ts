import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { evaluateJev } from '@/lib/jev-engine'
import { requireCrmAccess, crmCorsHeaders } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const authError = await requireCrmAccess(request)
    if (authError) return authError

    const body = await request.json()
    const {
      buyer_id,
      buyer_email,
      email_subject = '',
      email_body = '',
    } = body

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let buyer = null
    if (buyer_id) {
      const { data } = await admin.from('buyers').select('*').eq('id', buyer_id).single()
      buyer = data
    } else if (buyer_email) {
      const { data } = await admin.from('buyers').select('*').ilike('email', buyer_email).limit(1)
      buyer = data?.[0] ?? null
    }

    const companyName = buyer?.company_name || 'Bapak/Ibu Pimpinan'
    const contactName = buyer?.contact_name || 'Bapak/Ibu'

    // Run Unified System 1 JEV Engine (< 50ms)
    const s1 = evaluateJev({
      text: `${email_subject} ${email_body}`,
      buyer,
      channel: 'email',
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.haturan.com'
    const tdsUrl = `${appUrl}/api/pdf/spec-sheet/bawang-goreng`

    // System 2: Structured B2B Sales Prose Synthesis
    let draftSubject = `Re: Penawaran Bawang Merah Goreng Industri - PT Haturan Spice Indonesia`
    let draftBody = ''

    if (s1.intent === 'SAMPLE_REQUEST') {
      draftSubject = `Konfirmasi Pengiriman Sampel Bawang Merah Goreng - PT Haturan Spice Indonesia (${companyName})`
      draftBody = `Yth. ${contactName} (${companyName}),\n\nTerima kasih atas minat dan respon positif Bapak/Ibu terhadap produk rempah PT Haturan Spice Indonesia.\n\nMenindaklanjuti permintaan Bapak/Ibu, kami dengan senang hati menyiapkan paket sampel resmi Bawang Merah Goreng (250 gram - Grade A Crispy Slice & Grade B Coarse Ground) dari pusat sortasi kami di Bogor.\n\nMohon konfirmasi alamat pengiriman dan nomor kontak penerima agar kami dapat menerbitkan resi ekspedisi (Paxel / JNE Cargo).\n\nSebagai referensi teknis mutu industri (low free-oil FFA < 0.5%, kadar air < 3.0%), Lembar Data Teknis resmi (TDS) dapat diunduh pada tautan berikut:\n${tdsUrl}\n\nSalam hangat,\nAgung Gunawan\nDirektur, PT Haturan Spice Indonesia\nWhatsApp: +62 812-xxxx-xxxx | info@haturan.com`
    } else if (s1.intent === 'PRICE_INQUIRY') {
      const formattedPrice = new Intl.NumberFormat('id-ID').format(s1.suggestedPrice)
      draftSubject = `Surat Penawaran Harga (SPH) Bawang Merah Goreng Mutu Industri - ${companyName}`
      draftBody = `Yth. ${contactName} (${companyName}),\n\nMenjawab kebutuhan pasokan bahan baku di ${companyName}, berikut kami sampaikan rincian penawaran harga resmi Bawang Merah Goreng varietas asli Brebes/Sumenep mutu industri:\n\n• Produk: Bawang Merah Goreng Pilihan (Crispy Golden Flakes)\n• Spesifikasi: Irisan renyah utuh keemasan, aroma harum murni, tiris minyak sentrifugal (kadar air < 3.0%)\n• Kemasan: Bal 5 kg ganda PE dalam karton box 10-20 kg / zak 25 kg\n• Harga Penawaran: Rp ${formattedPrice} / kg (Franco Jabodetabek / Bandung)\n• Syarat Pembayaran: Cash Before Delivery (CBD) untuk pesanan perdana, TOP 14 hari setelah KYC\n• Lead Time: 3-5 hari kerja dari fasilitas Bogor\n\nDokumen Technical Data Sheet (TDS) resmi dapat ditinjau di sini:\n${tdsUrl}\n\nKami siap mengirimkan sampel 250 gram secara gratis untuk uji organoleptik di dapur riset/QC Bapak/Ibu.\n\nHormat kami,\nAgung Gunawan\nDirektur, PT Haturan Spice Indonesia\nhaturan.com`
    } else if (s1.intent === 'NEGOTIATION') {
      if (s1.floorPriceViolation) {
        draftSubject = `Tanggapan Penawaran Harga Bawang Merah Goreng - ${companyName}`
        draftBody = `Yth. ${contactName} (${companyName}),\n\nTerima kasih atas keterbukaan Bapak/Ibu dalam proses negosiasi harga pasokan bawang merah goreng.\n\nSetelah kami koordinasikan dengan tim pengadaan dan fasilitas sortasi kami di Bogor, untuk mempertahankan standar mutu tanpa kompromi (minyak kelapa sawit premium, de-oiling sentrifugal, kemasan PE food-grade ganda), harga dasar volume industri terbaik yang dapat kami tawarkan adalah Rp 144.000 - Rp 149.000 / kg (Franco).\n\nKami sangat terbuka untuk menjadwalkan pengiriman bertahap (kontrak pasokan 3-6 bulan) agar Bapak/Ibu mendapatkan harga volume paling optimal.\n\nSalam hormat,\nAgung Gunawan\nDirektur, PT Haturan Spice Indonesia`
      } else {
        draftSubject = `Penyesuaian Skema Volume Bawang Merah Goreng - ${companyName}`
        draftBody = `Yth. ${contactName} (${companyName}),\n\nMenindaklanjuti diskusi mengenai penyesuaian volume dan efisiensi pengiriman ke fasilitas ${companyName}, kami bersedia menyesuaikan skema ke Tier volume khusus:\n\n• Tier Katering / Industri: Rp 150.000 - Rp 155.000 / kg Franco Jabodetabek\n• Pengiriman: Terjadwal mingguan langsung dari hub logistik Bogor\n\nApakah kami dapat mengirimkan SPH revisi dan contoh sampel 250g untuk validasi akhir pekan ini?\n\nHormat kami,\nAgung Gunawan\nDirektur, PT Haturan Spice Indonesia`
      }
    } else {
      draftSubject = `Follow-Up Pasokan Rempah & Bawang Merah Goreng - PT Haturan Spice Indonesia`
      draftBody = `Yth. ${contactName} (${companyName}),\n\nSemoga pesan ini menjumpai Bapak/Ibu dalam keadaan prima.\n\nKami dari PT Haturan Spice Indonesia ingin memastikan apakah Bapak/Ibu saat ini sedang melakukan evaluasi berkala untuk pasokan Bawang Merah Goreng dan bumbu industri di ${companyName}.\n\nFasilitas pemrosesan kami di Bogor siap menjamin kestabilan pasokan hingga 5 ton/minggu dengan spesifikasi rendah minyak (FFA < 0.5%) dan masa simpan optimal.\n\nBrosur dan spesifikasi teknis lengkap dapat diakses di:\n${tdsUrl}\n\nSalam hangat,\nAgung Gunawan\nDirektur, PT Haturan Spice Indonesia\nWhatsApp: +62 812-xxxx-xxxx`
    }

    return NextResponse.json(
      {
        success: true,
        jev_decision: s1,
        draft: {
          subject: draftSubject,
          body: draftBody,
          tds_url: tdsUrl,
        },
      },
      { headers: crmCorsHeaders(request) }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500, headers: crmCorsHeaders(request) })
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: crmCorsHeaders(request),
  })
}
