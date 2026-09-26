import type { Buyer } from '@/types'

export type WhatsAppScriptType =
  | 'sample_offer'
  | 'volume_pricing'
  | 'cost_per_serving'
  | 'price_lock'

export type WhatsAppScriptOption = {
  id: WhatsAppScriptType
  title: string
  subtitle: string
  badge: string
  recommendedFor: string
}

export const WHATSAPP_SCRIPT_OPTIONS: WhatsAppScriptOption[] = [
  {
    id: 'sample_offer',
    title: '🎁 Penawaran Sampel Gratis 250g',
    subtitle: 'Uji organoleptik & kerenyahan dapur (Low Barrier to Entry)',
    badge: 'Paling Efektif',
    recommendedFor: 'Prospek Baru / Belum Pernah Beli',
  },
  {
    id: 'volume_pricing',
    title: '📊 Penawaran Harga Volume (Tier)',
    subtitle: 'Rincian harga Franco Jabodetabek (Tier Rp 155k / Rp 149k)',
    badge: 'Resmi',
    recommendedFor: 'Buyer yang Menanyakan Pricelist / SPH',
  },
  {
    id: 'cost_per_serving',
    title: '💡 Komparasi Hemat per Porsi Saji',
    subtitle: 'Kalkulasi ilmiah: Bawang Murni 3g vs Tepung Murah 6g',
    badge: 'Solusi Nego',
    recommendedFor: 'Buyer yang Mengeluh Harga Kemahalan',
  },
  {
    id: 'price_lock',
    title: '🔒 Kontrak Penguncian Harga (3 Bulan)',
    subtitle: 'Jaminan pasokan stabil bebas kenaikan musim hujan / akhir tahun',
    badge: 'Korporat',
    recommendedFor: 'Katering Massal & Pabrik Industri',
  },
]

export function cleanWhatsAppNumber(phone?: string | null): string {
  if (!phone) return ''
  // Strip non-digits
  let digits = phone.replace(/\D/g, '')
  if (!digits) return ''

  // Format Indonesian local number 08xx to 628xx
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1)
  } else if (digits.startsWith('8')) {
    digits = '628' + digits.slice(1)
  } else if (!digits.startsWith('62') && digits.length >= 9) {
    digits = '62' + digits
  }

  return digits
}

export function formatDisplayPhoneNumber(phone?: string | null): string {
  if (!phone) return '—'
  const clean = cleanWhatsAppNumber(phone)
  if (clean.startsWith('62') && clean.length >= 10) {
    // Format: +62 812-3456-7890
    const prefix = '+62 '
    const body = clean.slice(2)
    if (body.length === 10) {
      return `${prefix}${body.slice(0, 3)}-${body.slice(3, 7)}-${body.slice(7)}`
    } else if (body.length === 11) {
      return `${prefix}${body.slice(0, 3)}-${body.slice(3, 7)}-${body.slice(7)}`
    } else if (body.length === 12) {
      return `${prefix}${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`
    }
  }
  return phone
}

export function getWhatsAppPitchText(
  type: WhatsAppScriptType,
  buyer: Buyer,
  baseUrl = 'https://app.haturan.com'
): string {
  const contactName = buyer.contact_name?.trim() || 'Bapak/Ibu Tim Pengadaan'
  const companyName = buyer.company_name?.trim() || 'perusahaan Bapak/Ibu'
  const city = buyer.country && buyer.country !== 'Indonesia' ? buyer.country : 'Jabodetabek / Bandung'
  
  const tdsLink = `${baseUrl}/api/pdf/spec-sheet/bawang-goreng`
  const halalLink = `${baseUrl}/api/pdf/halal-declaration/bawang-goreng`

  switch (type) {
    case 'sample_offer':
      return `Selamat pagi / siang ${contactName} (${companyName}),

Salam kenal, saya *Agung Gunawan* dari *PT Haturan Spice Indonesia* (haturan.com), fasilitas pengolahan dan distribusi bahan baku rempah industri di Bogor.

Kami mengamati perkembangan operasional dapur ${companyName}. Untuk menjamin rasa gurih autentik dan kerenyahan maksimal pada menu masakan, kami ingin memperkenalkan pasokan rutin *Bawang Merah Goreng Varietas Brebes Super Murni*:

• *Kualitas:* Murni umbi Brebes segar tanpa campuran tepung (NIL), tiris minyak otomatis sentrifugal (*low free-oil*).
• *Varian:* Grade A Crispy Slice (taburan utuh) & Grade B Coarse Ground (racikan bumbu/kuah).
• *Kemasan:* Bal ganda PE food-grade 5 kg & master carton 10–20 kg.
• *Jaminan Mutu:* Menggunakan minyak kelapa sawit nabati bersertifikasi Halal MUI/BPOM.

Sebagai langkah awal kemitraan, kami siap mengirimkan *FREE SAMPLE (250–500 gram)* ke dapur ${companyName} agar Chef / tim QC Bapak/Ibu dapat menguji langsung rasa dan kerenyahannya.

Lembar Data Teknis resmi (TDS) dapat ditinjau di: ${tdsLink}
Surat Jaminan Mutu & Halal: ${halalLink}

Kira-kira paket sampel gratis ini dapat kami kirimkan ke alamat dapur mana ya? Terima kasih banyak atas kesempatannya.

Salam hangat,
*Agung Gunawan*
Direktur, PT Haturan Spice Indonesia
Sentra Distribusi: Bogor, Jawa Barat`

    case 'volume_pricing':
      return `Yth. ${contactName} (${companyName}),

Menindaklanjuti kebutuhan pasokan bahan baku di ${companyName}, berikut kami sampaikan rincian penawaran harga resmi (*Surat Penawaran Harga / SPH*) komoditas *Bawang Merah Goreng Mutu Industri* (Franco ${city}):

*Matriks Penawaran Harga Volume:*
• *Tier 1 (100 – 499 kg):* Rp 165.000 / kg
• *Tier 2 (500 – 999 kg):* *Rp 155.000 / kg* (Katering / Central Kitchen)
• *Tier 3 (1.000 – 2.000 kg):* *Rp 149.000 / kg* (Kontrak Pasokan Rutin)
• *Tier 4 (> 2.000 kg):* *Rp 144.000 / kg* (Volume Manufaktur Industri)

*Ketentuan Layanan:*
1. *Spesifikasi:* Brebes murni tanpa tepung, kadar air < 3%, tiris sentrifugal.
2. *Pengiriman:* Langsung dari fasilitas pengolahan mitra kami di Bogor menggunakan armada tertutup resmi.
3. *Termin Pembayaran:* DP 50% saat PO / pelunasan saat BAST timbang terima di gudang Bapak/Ibu (Fasilitas TOP 14–30 hari terbuka setelah audit KYC).

Dokumen TDS Spesifikasi Lengkap: ${tdsLink}

Apakah kami dapat mengirimkan paket sampel 250g untuk validasi dapur sebelum pesanan perdana? Terima kasih.

Hormat kami,
*Agung Gunawan*
PT Haturan Spice Indonesia (haturan.com)`

    case 'cost_per_serving':
      return `Selamat pagi / siang ${contactName} (${companyName}),

Terima kasih atas diskusinya mengenai harga pasokan bawang merah goreng. 

Seringkali kami menemui rekan pengadaan yang membandingkan dengan bawang pasar murah (Rp 115.000 – Rp 125.000/kg). Izinkan kami berbagi hitungan matematis *Cost-per-Serving (Biaya per Mangkok Saji)* yang telah terbukti di mitra resto kami:

1. *Bawang Murah Pasaran:* Mengandung 15–20% balutan tepung dan ditiris manual (minyak residu tinggi). Begitu terkena kuah panas/nasi box, bawang cepat layu dan tenggelam. Dapur terpaksa menabur *5–6 gram per porsi*.
   -> Biaya: Rp 120.000 / 1.000g x 6g = *Rp 720 / mangkok*.

2. *Bawang Haturan (Tiris Sentrifugal Murni):* Murni tanpa tepung dan kering renyah mengapung. Cukup tabur *3 gram saja*, aroma dan kerenyahannya sudah sangat dominan.
   -> Biaya: Rp 155.000 / 1.000g x 3g = *Rp 465 / mangkok*.

👉 *Kesimpulan:* Dapur ${companyName} justru *MENGHEMAT Rp 255 per porsi saji* dengan memakai produk Haturan!

Kami sangat yakin dengan kualitas ini. Apakah kami boleh kirimkan sampel 250g untuk ditimbang dan dicoba langsung oleh Chef di dapur ${companyName}?

Salam hormat,
*Agung Gunawan*
PT Haturan Spice Indonesia`

    case 'price_lock':
      return `Yth. ${contactName} (${companyName}),

Memasuki fluktuasi harga komoditas jelang perubahan musim dan hari raya, PT Haturan Spice Indonesia menawarkan program *Penguncian Harga Stabilitas Pasokan (Price-Lock Contract)* untuk ${companyName}:

*Keunggulan Program Price-Lock Haturan:*
• *Harga Terkunci Flat 3 Bulan:* Rp 149.000 – Rp 155.000 / kg (Bebas risiko kenaikan pasar induk yang kerap melonjak ke Rp 180.000+).
• *Pengiriman Fleksibel:* Kuota bulanan dapat dikirim terjadwal mingguan (misal 250–500 kg per drop) langsung dari hub logistik Bogor.
• *Jaminan Mutu Konsisten:* Spesifikasi tiris sentrifugal, bebas tepung, kemasan karton PE ganda.
• *Pernyataan Keamanan Pangan:* Didukung jaminan mutu resmi dan sertifikasi minyak halal.

Tautan Spesifikasi & Legalitas Mutu: ${tdsLink}

Apakah kita dapat menjadwalkan diskusi singkat via telepon atau pertemuan untuk mengunci alokasi kuota panen ${companyName}? Terima kasih.

Salam hangat,
*Agung Gunawan*
Direktur, PT Haturan Spice Indonesia
WhatsApp: +62 812-xxxx-xxxx | commercial@haturan.com`
  }
}

export function buildWhatsAppDirectUrl(phone: string, text: string): string {
  const cleanPhone = cleanWhatsAppNumber(phone)
  if (!cleanPhone) return ''
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
}
