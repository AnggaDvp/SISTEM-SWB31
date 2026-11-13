-- SYSTEM NSS SWB31 - Skema database (SQLite / Turso libSQL)
-- Aman dijalankan berulang kali (IF NOT EXISTS).
-- Catatan: salinan skema yang sama ada di lib/schema.ts (dipakai otomatis oleh aplikasi).
-- Kolom tambahan pada DB lama ditangani oleh migrateExtraColumns() di lib/schema.ts.

CREATE TABLE IF NOT EXISTS customers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_no         TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  whatsapp            TEXT NOT NULL DEFAULT '',
  raw_phone           TEXT NOT NULL DEFAULT '',
  ket_fu              TEXT NOT NULL DEFAULT '',
  plate               TEXT NOT NULL DEFAULT '',
  brand               TEXT NOT NULL DEFAULT '',
  motor_type          TEXT NOT NULL DEFAULT '',
  tenor               INTEGER CHECK (tenor IS NULL OR (tenor BETWEEN 1 AND 32)),
  installment_running INTEGER CHECK (installment_running IS NULL OR installment_running >= 0),
  comm_status         TEXT NOT NULL DEFAULT 'Belum Dihubungi'
                      CHECK (comm_status IN ('Belum Dihubungi', 'Sudah Dihubungi', 'Berminat', 'Tidak Berminat', 'Follow Up Kembali')),
  wa_status           TEXT NOT NULL DEFAULT 'Belum Diproses'
                      CHECK (wa_status IN ('Belum Diproses', 'WhatsApp Dibuka', 'Selesai Dikonfirmasi', 'Gagal', 'Dilewati')),
  batch_id            INTEGER,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_brand ON customers (brand);
CREATE INDEX IF NOT EXISTS idx_customers_tenor ON customers (tenor);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers (comm_status);
CREATE INDEX IF NOT EXISTS idx_customers_wa_status ON customers (wa_status);
CREATE INDEX IF NOT EXISTS idx_customers_batch ON customers (batch_id);

-- Akun tambahan untuk petugas di masa depan (admin utama diambil dari environment variable).
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pengaturan aplikasi (mis. template pesan WhatsApp, poster promo).
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Riwayat tiap proses import Excel.
CREATE TABLE IF NOT EXISTS import_batches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  filename    TEXT NOT NULL,
  sheet       TEXT NOT NULL DEFAULT '',
  total       INTEGER NOT NULL DEFAULT 0,
  valid       INTEGER NOT NULL DEFAULT 0,
  invalid     INTEGER NOT NULL DEFAULT 0,
  duplicate   INTEGER NOT NULL DEFAULT 0,
  processed   INTEGER NOT NULL DEFAULT 0,
  unprocessed INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_import_batches_time ON import_batches (uploaded_at);

-- Log aksi blast WhatsApp (setiap kali tombol Chat ditekan) + status proses & admin.
CREATE TABLE IF NOT EXISTS blast_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'WhatsApp Dibuka',
  admin       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_blast_logs_created ON blast_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_blast_logs_customer ON blast_logs (customer_id);
