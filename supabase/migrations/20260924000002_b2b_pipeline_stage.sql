-- Migration: 20260924000002_b2b_pipeline_stage.sql
-- Description: Add pipeline_stage to buyers table and set initial stage mappings

alter table buyers
add column if not exists pipeline_stage varchar(30) default 'lead';

-- Set initial stages for known accounts
update buyers set pipeline_stage = 'active_customer'
where company_name in (
  'PT Mitra Bali Sukses (Mie Gacoan)',
  'PT Belfoods Indonesia'
);

update buyers set pipeline_stage = 'target_outreach'
where company_name in (
  'PT Boga Mitra Sarana',
  'PT Kreasi Rasa Inti Selera (KRAIS)',
  'Restu Mande',
  'Bakso Boedjangan (CRP Group)',
  'Joze Food',
  'PT Paradise Seera Abadi',
  'PT Karawang Foods Lestari',
  'PT AIMFOOD Manufacturing Indonesia',
  'UFI Masuya Nusantara',
  'PT Indo Pangan Utama'
);
