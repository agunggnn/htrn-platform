# 🌶️ HTRN Platform — PT Haturan Spice Indonesia

> **Asset-Light B2B Agritech ERP & Omnichannel Autonomous Sales CRM Platform**  
> Resmi dikembangkan untuk operasional perdagangan komoditas B2B PT Haturan Spice Indonesia (`haturan.com`).

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.12_(Turbopack)-black?style=flat&logo=next.js)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Status Terakhir Sistem (Per 26 September 2026)

- **Branch**: `main`
- **Total Route Terkompilasi**: **51 static & dynamic routes** (`npm run build` sukses via Turbopack)
- **Status Typecheck**: **0 TypeScript Error** (`npm run typecheck` 100% lulus)
- **Kompatibilitas Runtime**: Next.js 16 Turbopack, React 19, Cloudflare / Vercel Serverless
- **Keamanan Kredensial**: Kepatuhan penuh Hetzer Credential Safety (0 plaintext secret, Web Settings Secret Vault di `/settings/integrations`)

---

## 📚 Dokumentasi Lengkap Repositori

| Dokumen | Lokasi | Cakupan Pembahasan |
|---|---|---|
| **Arsitektur Lengkap** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Diagram alur sistem, paradigma JEV System 1 & 2, struktur HPP Mas Parmin, batasan floor price (Rp 140k), 4-Layer B2B KYC, dan ERD Mermaid Supabase Postgres. |
| **Walkthrough Pemutakhiran** | [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md) | Rekam jejak seluruh pemutakhiran platform dari TASK-12 hingga TASK-20 beserta hasil verifikasi uji sistem. |
| **Integrasi Chatwoot & MCP** | [`docs/chatwoot_mcp_whatsapp_architecture.md`](docs/chatwoot_mcp_whatsapp_architecture.md) | Desain webhook receiver WhatsApp Cloud API, sidebar embedded dashboard Chatwoot, dan tools MCP otonom saat AFK. |
| **Log Perkembangan Fase** | [`PROGRESS.md`](PROGRESS.md) | Riwayat perkembangan platform terperinci dari Fase 1 hingga Fase 15. |

---

## 🚀 Fitur Unggulan Platform

### 1. 🏭 Mas Parmin B2B Maklon Dropship Desk & Blind Shipping
- **Outsourced Fulfillment**: 100% produksi dan pengemasan dialihdayakan ke Hub Sortasi Mas Parmin (CV Daun Mas, Bogor).
- **Protokol Blind Shipping**: Pengiriman resmi membawa **Surat Jalan & BAST PDF ber-kop surat resmi PT Haturan Spice Indonesia** yang dapat dicetak langsung via `/api/pdf/surat-jalan/[id]`.
- **Kalkulator Margin Real-Time**: HPP Mas Parmin Rp 125.000/kg, ongkir flat Jabodetabek Rp 350.000, kemasan Rp 12.000/box $\rightarrow$ mengunci gross profit otomatis.
- **Generator SPK WhatsApp**: Format teks WhatsApp formal siap kirim langsung ke Mas Parmin dengan rincian bal (5 kg) dan master box (20 kg).

### 2. 🧠 Unified JEV System 1 Decision Engine (`lib/jev-engine.ts`)
- **Latensi Sub-30ms & $0 Biaya Token**: Evaluasi deterministik non-autoregresif yang bebas halusinasi untuk pertanyaan berulang.
- **7 Intensi Terkalibrasi**: Sampel 250g gratis, FAQ mutu TDS/Halal, penawaran harga volume, negosiasi, komitmen PO, permohonan tempo, dan proteksi spam.
- **Floor Price Guardrail**: Mengunci batas bawah negosiasi absolut di **Rp 140.000/kg** (Safety Tripwire).
- **Matriks Harga Tier Volume**:
  - Tier 1 (100–499 kg): **Rp 165.000/kg**
  - Tier 2 (500–999 kg): **Rp 155.000/kg**
  - Tier 3 (1.000–2.000 kg): **Rp 149.000/kg**
  - Tier 4 (> 2.000 kg): **Rp 144.000/kg**

### 3. 🛡️ 4-Layer Enterprise B2B KYC Pipeline
- **Layer 1: Social Graph & Caller ID**: Engine enkripsi open-source AES-256-ECB Getcontact (`lib/getcontact.ts`, diadopsi dari `xdreizein666/getcontact-cli`) yang berjalan otomatis di background tanpa biaya langganan berbayar.
- **Layer 2: Corporate Reality**: Validasi Nomor Induk Berusaha (NIB OSS 13 digit) & NPWP 16 digit Coretax.
- **Layer 3: Risk-Based Terms Governance**: Pembeli baru wajib CBD / DP 50%. Fasilitas kredit tempo (Net 7 / Net 14) hanya terbuka setelah 3x transaksi lunas dan lolos verifikasi legalitas.
- **Layer 4: Real-Time WhatsApp Gating**: Otomatis memblokir permohonan tempo jika skor risiko tinggi.

### 4. 💬 Omnichannel WhatsApp & Chatwoot Integration
- **Zero Extra Hosting ($0/bulan)**: Meta WhatsApp Business Cloud API (1.000 percakapan inisiasi pelanggan gratis per bulan) disambungkan ke Chatwoot Cloud Free Tier.
- **Embedded Dashboard App**: Panel iframe samping di Chatwoot (`/crm/embed/chatwoot`) menampilkan status KYC buyer, toggle `[🤖 Auto-Pilot]` vs `[👤 Manual]`, dan link cepat pembuatan SPH resmi.
- **WhatsApp Web Extension v1.0.2**: Observer DOM otomatis di `web.whatsapp.com` untuk menyinkronkan keabsahan nomor WhatsApp ke CRM secara real-time.

### 5. 🤖 Model Context Protocol (MCP) Server
Tersedia via HTTP JSON-RPC 2.0 (`/api/mcp`) dan Stdio CLI (`scripts/mcp-server.ts`), memungkinkan AI Agent (Hermes / Antigravity / Claude) mengeksekusi operasi bisnis:
- `htrn_jev_evaluate`: Evaluasi pesan buyer via JEV Engine.
- `htrn_getcontact_lookup`: Pengecekan Getcontact dan pengayaan profil KYC.
- `htrn_chatwoot_get_conversations` & `htrn_chatwoot_reply_whatsapp`: Kontrol percakapan WhatsApp saat Pak Agung AFK.
- `htrn_generate_mas_parmin_spk`: Otomasi penerbitan SPK produksi ke Bogor.

---

## 🛠️ Menjalankan Project Secara Lokal

### Prasyarat:
- Node.js $\ge 18$
- Akun Supabase (PostgreSQL)

### Instalasi:
```bash
git clone https://github.com/agunggnn/htrn-platform.git
cd htrn-platform
npm install
```

### Konfigurasi Lingkungan (`.env.local`):
Salin berkas `.env.local.example` dan isi variabel yang dibutuhkan:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Chatwoot Integration (Opsional untuk WhatsApp Otonom)
CHATWOOT_BASE_URL="https://app.chatwoot.com"
CHATWOOT_ACCOUNT_ID="your-account-id"
CHATWOOT_API_KEY="your-api-key"

# Getcontact Engine (Opsional untuk Live Lookup)
GETCONTACT_TOKEN=""
GETCONTACT_FINAL_KEY=""
```

### Menjalankan Server Development:
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

### Memeriksa Kualitas & Kompilasi:
```bash
npm run typecheck    # Validasi TypeScript (0 error)
npm run build        # Build produksi Next.js Turbopack (49 routes)
```

---

## 📄 Lisensi
Hak Cipta © 2026 PT Haturan Spice Indonesia. Didistribusikan di bawah lisensi MIT.
