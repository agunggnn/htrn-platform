# 🚀 Panduan Memasang Ekstensi HTRN B2B CRM di Chrome / Edge (Alternatif Streak)

Ekstensi ini menghubungkan Gmail (`mail.google.com`) langsung dengan database B2B `htrn-platform` tanpa biaya langganan bulanan Streak ($49–$129/bln) dan tanpa batas kedaluwarsa 14 hari.

---

## ⚡ Cara Pasang (Hanya 15 Detik)

1. Buka browser **Google Chrome** atau **Microsoft Edge**.
2. Ketik di bilah alamat:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Aktifkan **Mode Pengembang** (*Developer Mode*) di pojok kanan atas.
4. Klik tombol **Muat yang belum dibongkar** (*Load Unpacked*).
5. Pilih folder:
   ```
   e:\GitHub\htrn-platform\extension
   ```
6. Selesai! Ikon **HTRN B2B CRM** akan muncul di toolbar browser.

---

## 🎯 Cara Pakai di Gmail

1. Buka **[mail.google.com](https://mail.google.com)**.
2. Buka thread email dari calon buyer (misal dari daftar 110 prospek Bawang Merah Goreng).
3. Di pojok kanan bawah akan muncul **Dock HTRN CRM**:
   - Jika buyer sudah ada di database, profil, tier harga (`Tier 1: Rp 165k` / `Tier 2: Rp 155k`), dan status pipelinenya langsung terbaca.
   - **Ganti Stage**: Anda bisa mengubah status deal (misal ke `Sample Sent` atau `Quotation Sent`) langsung dari Gmail.
   - **🪄 Draf Balasan AI B2B**: Klik untuk membuat balasan email penawaran resmi yang otomatis tersisip ke kotak pesan Gmail.
   - **📑 Sisipkan TDS Spek**: Klik untuk menyisipkan tautan Lembar Data Teknis resmi.
   - **+ Tambah ke HTRN CRM**: Jika ada email baru dari prospek yang belum terdaftar, 1 klik akan otomatis menyimpannya ke database Supabase.
