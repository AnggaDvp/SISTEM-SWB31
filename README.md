# SYSTEM NSS SWB31 – WhatsApp Blast Management

Aplikasi web (Next.js + React + TypeScript) dengan database SQLite melalui **Turso/libSQL**, siap di-deploy ke **Vercel**.

- 2 menu: **INPUT DATA** dan **TABLE DATA** (detail konsumen muncul saat nama diklik).
- Aplikasi terbuka langsung tanpa halaman login.
- WhatsApp Blast lewat link `wa.me` — pesan terisi otomatis, **tidak pernah terkirim otomatis**; admin tetap menekan Kirim di WhatsApp.
- Semua akses database lewat API server; token Turso tidak pernah sampai ke browser.

## Struktur

```
app/                 halaman (input, table) dan API routes (app/api/*)
components/          form, panel detail, editor template, navigasi
lib/                 db, pembantu API, validasi, salam, template pesan, master tipe motor
db/schema.sql        skema SQLite (salinan yang sama ada di lib/schema.ts)
scripts/             init-db.mjs, backup.mjs, migrate-turso.mjs
.github/workflows/   backup mingguan otomatis
```

## 1. Menjalankan di komputer

Butuh Node.js 20+.

```bash
npm install
cp .env.example .env.local     # lalu isi nilainya (langkah 2)
npm run db:init                # opsional, tabel juga dibuat otomatis saat pertama dipakai
npm run dev                    # buka http://localhost:3000
```

Cek kode: `npm run typecheck` dan `npm run build`.

## 2. Database Turso dan Environment Variables

```bash
turso db show nss-swb31-vercel --url      # -> TURSO_DATABASE_URL (libsql://...)
turso db tokens create nss-swb31-vercel   # -> TURSO_AUTH_TOKEN
```

| Nama | Isi |
|---|---|
| `TURSO_DATABASE_URL` | URL database `libsql://...` |
| `TURSO_AUTH_TOKEN` | Token dari Turso |

Lokal: isi di `.env.local`. Di Vercel: **Project → Settings → Environment Variables** (aktifkan untuk Production, Preview, dan Development). Jangan pernah commit `.env.local` (sudah ada di `.gitignore`).

## 3. Deploy GitHub → Vercel

1. Push project ke repository GitHub.
2. Di vercel.com: **Add New → Project** → pilih repository tersebut (framework Next.js terdeteksi otomatis).
3. Isi kedua Environment Variables di atas, lalu **Deploy**.
4. Setiap push ke branch `main` akan otomatis membuat deployment baru.

## 4. Cara kerja fitur penting

- **Nomor kontrak unik** (UNIQUE di database). Jika sudah ada, form menawarkan tombol *Perbarui data yang sudah ada* — tanpa duplikat.
- **Tenor** hanya dropdown 1–32 Bulan; **Angsuran berjalan** tidak boleh melebihi tenor; **Sisa** = tenor − angsuran berjalan (dihitung otomatis).
- **Nomor WhatsApp**: menerima `08…`, `62…`, `+62…`, disimpan sebagai `62…`. Kosong/tidak valid → tombol **CHAT WHATSAPP** nonaktif. Format valid: `628` + 8–11 digit.
- **Salam** (zona Asia/Jakarta): 04.00–10.59 Pagi, 11.00–14.59 Siang, 15.00–17.59 Sore, 18.00–03.59 Malam; dihitung saat tombol diklik.
- **Template pesan** bisa diubah di bawah tabel (TABLE DATA → *Template Pesan WhatsApp*), tersimpan di database. Penanda: `{KONDISI_SALAM}`, `{NAMA_KONSUMEN}`, `{NOMOR_KONTRAK}`.
- **Status komunikasi**: Belum Dihubungi, Sudah Dihubungi, Berminat, Tidak Berminat, Follow Up Kembali (diubah dari panel detail, langsung tersimpan).
- **Tipe motor**: autocomplete per merek dari `lib/motor-types.ts` (nama + variasi penulisan), dan boleh ketik manual.
- **Plat nomor tidak dipakai menebak tipe motor.** Integrasi database Ranmor/internal hanya boleh ditambahkan jika ada sumber resmi dan izin akses.

## 5. Backup dan pemulihan

- **Export CSV**: tombol *Export CSV (Excel)* di TABLE DATA.
- **Backup penuh**: tombol *Backup Database* → file JSON (semua konsumen + template).
- **Backup berkala**: `.github/workflows/backup.yml` berjalan tiap minggu (juga bisa dijalankan manual dari tab Actions). Isi secrets `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` di GitHub; hasil ada di *Artifacts* (90 hari). Gunakan repository private. Backup manual dari terminal: `npm run db:backup`.
- **Pemulihan**: TABLE DATA → *Pulihkan Backup* → pilih file JSON. Pemulihan bersifat **menambah/memperbarui berdasarkan nomor kontrak dan tidak menghapus data yang sudah ada**.
- Turso juga menyediakan point-in-time restore pada paket tertentu (lihat dokumentasi Turso).

## 6. Memindahkan data ke database baru

`scripts/migrate-turso.mjs` menyalin data dari database lama ke database baru tanpa menghapus apa pun (menambah/memperbarui berdasarkan nomor kontrak):

```bash
# PowerShell
$env:SOURCE_TURSO_DATABASE_URL="libsql://database-lama.turso.io"
$env:SOURCE_TURSO_AUTH_TOKEN="token-database-lama"
$env:TARGET_TURSO_DATABASE_URL="libsql://nss-swb31-vercel-....turso.io"
$env:TARGET_TURSO_AUTH_TOKEN="token-database-baru"
npm run db:migrate
```

## 7. Keamanan

- Aplikasi berjalan tanpa login; siapa pun yang memiliki alamat website dapat membaca dan mengubah data. Gunakan alamat yang tidak dipublikasikan dan/atau batasi akses lewat pengaturan Vercel (mis. **Vercel Authentication / Password Protection** pada paket Pro) bila data bersifat sensitif.
- Semua query SQL memakai parameter (anti SQL injection); pesan error ke pengguna tidak membocorkan detail, detail teknis hanya di log server.
- Token Turso hanya dibaca di server (API routes berjalan di runtime Node.js) dan tidak pernah dikirim ke browser.
- Export CSV menetralkan sel yang diawali `= + - @` agar aman dibuka di Excel.

## 8. Pengembangan lokal tanpa akun Turso

Jalankan database lokal: `turso dev` (biasanya `http://127.0.0.1:8080`), lalu isi `TURSO_DATABASE_URL=http://127.0.0.1:8080` dan kosongkan `TURSO_AUTH_TOKEN`.
