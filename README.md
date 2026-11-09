# SYSTEM NSS SWB31 – WhatsApp Blast Management

Aplikasi web (Next.js + React + TypeScript) dengan database SQLite melalui **Turso/libSQL**, siap di-deploy ke **Vercel**.

- 2 menu: **INPUT DATA** dan **TABLE DATA** (detail konsumen muncul saat nama diklik).
- WhatsApp Blast lewat link `wa.me` — pesan terisi otomatis, **tidak pernah terkirim otomatis**; admin tetap menekan Kirim di WhatsApp.
- Semua akses database lewat API server; token Turso tidak pernah sampai ke browser.

## Struktur

```
app/                 halaman (login, input, table) dan API routes (app/api/*)
components/          form, panel detail, editor template, navigasi
lib/                 db, sesi, auth, validasi, salam, template pesan, master tipe motor
db/schema.sql        skema SQLite (salinan yang sama ada di lib/schema.ts)
scripts/             init-db.mjs, backup.mjs
.github/workflows/   backup mingguan otomatis
```

## 1. Menjalankan di komputer

Butuh Node.js 20+.

```bash
npm install
cp .env.example .env.local     # lalu isi nilainya (langkah 2 & 3)
npm run db:init                # opsional, tabel juga dibuat otomatis saat pertama dipakai
npm run dev                    # buka http://localhost:3000
```

Cek kode: `npm run typecheck` dan `npm run build`.

## 2. Membuat database Turso

```bash
# pasang CLI Turso: https://docs.turso.tech/cli/installation
turso auth login
turso db create nss-swb31
turso db show nss-swb31 --url          # -> TURSO_DATABASE_URL (libsql://...)
turso db tokens create nss-swb31       # -> TURSO_AUTH_TOKEN
```

Atau lewat dashboard Turso (turso.tech): buat database, salin URL dan buat token.

## 3. Environment Variables

| Nama | Isi |
|---|---|
| `TURSO_DATABASE_URL` | URL database `libsql://...` |
| `TURSO_AUTH_TOKEN` | Token dari Turso |
| `ADMIN_EMAIL` | Email login admin |
| `ADMIN_PASSWORD` | Password admin (panjang & unik) |
| `SESSION_SECRET` | Acak, minimal 32 karakter: `openssl rand -base64 48` |

Lokal: isi di `.env.local`. Di Vercel: **Project → Settings → Environment Variables**. Jangan pernah commit `.env.local` (sudah ada di `.gitignore`).

## 4. Deploy GitHub → Vercel

1. Buat repository **private** di GitHub, lalu unggah isi folder project ini.
2. Di vercel.com: **Add New → Project** → pilih repository tersebut (framework Next.js terdeteksi otomatis).
3. Isi kelima Environment Variables di atas, lalu **Deploy**.
4. Buka alamat Vercel, login dengan `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
5. Mengganti password admin: ubah `ADMIN_PASSWORD` di Vercel lalu **Redeploy**.

## 5. Cara kerja fitur penting

- **Nomor kontrak unik** (UNIQUE di database). Jika sudah ada, form menawarkan tombol *Perbarui data yang sudah ada* — tanpa duplikat.
- **Tenor** hanya dropdown 1–32 Bulan; **Angsuran berjalan** tidak boleh melebihi tenor; **Sisa** = tenor − angsuran berjalan (dihitung otomatis).
- **Nomor WhatsApp**: menerima `08…`, `62…`, `+62…`, disimpan sebagai `62…`. Kosong/tidak valid → tombol **CHAT WHATSAPP** nonaktif. Format valid: `628` + 8–11 digit.
- **Salam** (zona Asia/Jakarta): 04.00–10.59 Pagi, 11.00–14.59 Siang, 15.00–17.59 Sore, 18.00–03.59 Malam; dihitung saat tombol diklik.
- **Template pesan** bisa diubah di bawah tabel (TABLE DATA → *Template Pesan WhatsApp*), tersimpan di database. Penanda: `{KONDISI_SALAM}`, `{NAMA_KONSUMEN}`, `{NOMOR_KONTRAK}`.
- **Status komunikasi**: Belum Dihubungi, Sudah Dihubungi, Berminat, Tidak Berminat, Follow Up Kembali (diubah dari panel detail, langsung tersimpan).
- **Tipe motor**: autocomplete per merek dari `lib/motor-types.ts` (nama + variasi penulisan), dan boleh ketik manual.
- **Plat nomor tidak dipakai menebak tipe motor.** Integrasi database Ranmor/internal hanya boleh ditambahkan jika ada sumber resmi dan izin akses.

## 6. Backup dan pemulihan

- **Export CSV**: tombol *Export CSV (Excel)* di TABLE DATA.
- **Backup penuh**: tombol *Backup Database* → file JSON (semua konsumen + template).
- **Backup berkala**: `.github/workflows/backup.yml` berjalan tiap minggu (juga bisa dijalankan manual dari tab Actions). Isi secrets `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` di GitHub; hasil ada di *Artifacts* (90 hari). Gunakan repository private. Backup manual dari terminal: `npm run db:backup`.
- **Pemulihan**: TABLE DATA → *Pulihkan Backup* → pilih file JSON. Pemulihan bersifat **menambah/memperbarui berdasarkan nomor kontrak dan tidak menghapus data yang sudah ada**.
- Turso juga menyediakan point-in-time restore pada paket tertentu (lihat dokumentasi Turso).

## 7. Keamanan

- Login email + password; sesi berupa cookie **HttpOnly, Secure (produksi), SameSite=Lax**, ditandatangani HMAC, berlaku 8 jam.
- Setiap API memeriksa sesi; request yang mengubah data juga memeriksa asal (Origin).
- Semua query SQL memakai parameter (anti SQL injection); pesan error ke pengguna tidak membocorkan detail.
- Pembatas percobaan login sederhana per instance server.
- Tabel `users` (password di-hash scrypt) sudah tersedia agar akun petugas bisa ditambah nanti; untuk tahap awal cukup satu admin dari environment variable.
- Export CSV menetralkan sel yang diawali `= + - @` agar aman dibuka di Excel.

## 8. Pengembangan lokal tanpa akun Turso

Jalankan database lokal: `turso dev` (biasanya `http://127.0.0.1:8080`), lalu isi `TURSO_DATABASE_URL=http://127.0.0.1:8080` dan kosongkan `TURSO_AUTH_TOKEN`.
