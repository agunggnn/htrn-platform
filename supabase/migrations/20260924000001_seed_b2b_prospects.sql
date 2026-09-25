-- Migration: 20260924000001_seed_b2b_prospects.sql
-- Description: Seed verified B2B prospects, key accounts, and benchmarks into the buyers table

insert into buyers (
  company_name, contact_name, email, phone, country, currency, language,
  payment_terms, notes, source, is_active,
  buyer_tier, credit_limit, payment_terms_allowed, preferred_packaging,
  gacoan_similarity_score, kyc_verified
)
select * from (
  values
    -- Benchmark Account
    (
      'PT Mitra Bali Sukses (Mie Gacoan)', 'Dede Yusup (Procurement Supervisor)', null, null,
      'Indonesia', 'IDR', 'id', 'TOP_30',
      'BENCHMARK UTAMA: Topping standar 4g per porsi. Kapasitas ratusan outlet nasional. Spesifikasi irisan renyah keemasan Brebes/Sumenep.',
      'Benchmark Gacoan', true,
      'tier_4', 500000000.00, 'TOP_30', 'bulk_25kg', 100, true
    ),
    -- Active Partner
    (
      'PT Belfoods Indonesia', 'Felicia Kurniawan (GM Procurement)', null, '021-8993-1234',
      'Indonesia', 'IDR', 'id', 'TOP_30',
      'BUYER AKTIF (JANGAN COLD OUTREACH): Fasilitas Jonggol/Bogor. Manufaktur sosis, nugget, olahan daging. Kebutuhan: Lada murni & rempah industri.',
      'Active Partner Mas Parmin', true,
      'tier_4', 300000000.00, 'TOP_30', 'bulk_25kg', 70, true
    ),
    -- Target 1: Boga Mitra Sarana
    (
      'PT Boga Mitra Sarana', 'Tim Purchasing / Procurement', 'info@bogamitrasarana.com', '021-85936170',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Institutional Catering Cikarang Barat (kapasitas hingga 10.000 porsi/hari). Kebutuhan: Bawang goreng slice bulk 20-25 kg / karton 10 kg Franco Cikarang. Potensi cross-sell: Bawang Putih Kupas.',
      'B2B Outreach 2026-09', true,
      'tier_2', 50000000.00, 'CBD', 'bulk_25kg', 60, false
    ),
    -- Target 2: KRAIS
    (
      'PT Kreasi Rasa Inti Selera (KRAIS)', 'Ibu Siti Nurbayti (Purchasing)', 'info@kraisfood.net', '+62 819-9505-0266',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Pabrik seasoning & flavor di Bekasi (bumbu mie, snack, olahan daging, premix). Kebutuhan: Bawang goreng slice & coarse ground (giling kasar) karung 20-25 kg.',
      'B2B Outreach 2026-09', true,
      'tier_2', 50000000.00, 'CBD', 'bulk_25kg', 55, false
    ),
    -- Target 3: Restu Mande
    (
      'Restu Mande', 'Owner / Tim Pengadaan', 'restumande.id@gmail.com', '0813-1379-1209',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Central kitchen masakan Padang, nasi box, & pelopor rendang instan kemasan di Bandung/Cileunyi. Kebutuhan: Bawang goreng renyah irisan kemasan bal 5 kg / karton 10 kg Franco Bandung.',
      'B2B Outreach 2026-09', true,
      'tier_1', 20000000.00, 'CBD', 'bulk_10kg', 55, false
    ),
    -- Target 4: CRP Group (Bakso Boedjangan)
    (
      'Bakso Boedjangan (CRP Group)', 'Central Kitchen & Chain Procurement', 'kemitraan@citarasaprima.com', '0812-2227-7800',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Jaringan resto nasional (menu Yamin & Bakso Kuah). Kebutuhan: Topping renyah multi-outlet bal 5 kg sentrifugal tiris minyak (Franco Bandung & Jabodetabek).',
      'B2B Outreach 2026-09', true,
      'tier_3', 100000000.00, 'CBD', 'bulk_10kg', 55, false
    ),
    -- Target 5: Joze Food
    (
      'Joze Food', 'Tim Purchasing', 'contact@jozefood.com', '0852-1698-0637',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Central kitchen distributor HORECA Bogor. Keunggulan lokal sesama Bogor: lead-time kilat & efisiensi ongkos kirim. Kebutuhan: Bawang goreng renyah bal 5 kg & karung 25 kg.',
      'B2B Outreach 2026-09', true,
      'tier_1', 25000000.00, 'CBD', 'bulk_10kg', 45, false
    ),
    -- Target 6: Paradise Seera Abadi
    (
      'PT Paradise Seera Abadi', 'Tim Purchasing & Pengadaan Dapur', 'paradiseseeraabadi@gmail.com', '+62 896-9283-1011',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Diet & corporate employee catering massal (Bandung & Bekasi). Kebutuhan: Bawang goreng tahan renyah di lunch box kemasan bal 5 kg / karton 10 kg.',
      'B2B Outreach 2026-09', true,
      'tier_2', 30000000.00, 'CBD', 'bulk_10kg', 45, false
    ),
    -- Target 7: Karawang Foods Lestari
    (
      'PT Karawang Foods Lestari', 'Procurement & R&D Bahan Baku', 'salessupport@karawangfoodslestari.com', '021-2961-7899',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Pabrik bahan baku saus & seasoning di Cikarang. Kebutuhan: Bawang merah goreng giling kasar (base saus) & irisan renyah. Potensi cross-sell: Lada bubuk murni mesh 60-80.',
      'B2B Outreach 2026-09', true,
      'tier_2', 50000000.00, 'CBD', 'bulk_25kg', 55, false
    ),
    -- Target 8: AIMFOOD Manufacturing
    (
      'PT AIMFOOD Manufacturing Indonesia', 'Tim Purchasing & R&D Maklon', 'headoffice@aimfood.info', '021-2961-8989',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Pabrik maklon/OEM bumbu, kaldu, & pangan di MM2100 Cikarang. Kebutuhan: Bawang merah giling kasar (base bumbu) & irisan karung 20-25 kg.',
      'B2B Outreach 2026-09', true,
      'tier_2', 50000000.00, 'CBD', 'bulk_25kg', 55, false
    ),
    -- Target 9: UFI Masuya Nusantara
    (
      'UFI Masuya Nusantara', 'Tim Operasional & Procurement', 'operation@ufi-masuya.co.id', '021-8265-2411',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Produsen saus & seasoning gurih di Bekasi. Kebutuhan: Bawang merah goreng giling kasar & irisan renyah kemasan bulk karung 20-25 kg.',
      'B2B Outreach 2026-09', true,
      'tier_2', 50000000.00, 'CBD', 'bulk_25kg', 45, false
    ),
    -- Target 10: Indo Pangan Utama
    (
      'PT Indo Pangan Utama', 'Tim Purchasing & Pengadaan', 'purchasing@indopanganutama.com', null,
      'Indonesia', 'IDR', 'id', 'CBD',
      'Manufaktur olahan makanan di Bekasi. Kebutuhan: Bawang merah goreng giling kasar & irisan kemasan bulk 20-25 kg.',
      'B2B Outreach 2026-09', true,
      'tier_2', 50000000.00, 'CBD', 'bulk_25kg', 45, false
    ),
    -- Telepon / WA Target: Rajo Food Solutions
    (
      'PT Rajo Food Solutions', 'Procurement / Owner', null, '0852-1261-6463',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Produksi sambal kemasan & food solutions di Depok (500+ kg/hari). Kebutuhan: Bawang merah giling kasar & irisan renyah bal 5 kg.',
      'B2B Outreach 2026-09', true,
      'tier_1', 20000000.00, 'CBD', 'bulk_10kg', 50, false
    ),
    -- Telepon Target: Citra Boga Catering
    (
      'Citra Boga Catering', 'Tim Pengadaan', null, '022-750-1921',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Katering korporat Bandung. Pemakaian rutin bulanan untuk nasi box & prasmanan.',
      'B2B Outreach 2026-09', true,
      'tier_1', 15000000.00, 'CBD', 'bulk_10kg', 45, false
    ),
    -- Telepon / WA Target: Miranty Catering
    (
      'Miranty Catering', 'Tim Dapur', null, '+62 821-5115-5525',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Katering event & nasi box Bandung. Pemakaian rutin harian.',
      'B2B Outreach 2026-09', true,
      'tier_1', 15000000.00, 'CBD', 'bulk_10kg', 45, false
    ),
    -- Bumbu Target: Golden Seasoning Factory
    (
      'Golden Seasoning Factory', 'Bagian Pembelian', null, '+62 895-7084-11411',
      'Indonesia', 'IDR', 'id', 'CBD',
      'Pabrik bumbu & seasoning gurih di Katapang Bandung. Kebutuhan: Bawang giling & ketumbar/lada bubuk.',
      'B2B Outreach 2026-09', true,
      'tier_1', 20000000.00, 'CBD', 'bulk_25kg', 55, false
    ),
    -- Bawang Putih Target: Bersama Olah Boga
    (
      'PT Bersama Olah Boga', 'Tim Pengadaan', null, null,
      'Indonesia', 'IDR', 'id', 'CBD',
      'Central kitchen & olahan makanan Bogor/Depok. Potensi pasokan Bawang Putih Kupas 1.5 ton/hari dari gudang Bogor.',
      'B2B Outreach 2026-09', true,
      'tier_2', 30000000.00, 'CBD', 'bulk_25kg', 50, false
    )
) as t(
  company_name, contact_name, email, phone, country, currency, language,
  payment_terms, notes, source, is_active,
  buyer_tier, credit_limit, payment_terms_allowed, preferred_packaging,
  gacoan_similarity_score, kyc_verified
)
where not exists (
  select 1 from buyers b where b.company_name = t.company_name
);
