-- SYSTEM NSS SWB31 - Skema database (SQLite / Turso libSQL)
-- Aman dijalankan berulang kali (IF NOT EXISTS).
-- Catatan: salinan skema yang sama ada di lib/schema.ts (dipakai otomatis oleh aplikasi).

CREATE TABLE IF NOT EXISTS customers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_no         TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  whatsapp            TEXT NOT NULL DEFAULT '',
  plate               TEXT NOT NULL DEFAULT '',
  brand               TEXT NOT NULL DEFAULT '' CHECK (brand IN ('', 'Honda', 'Yamaha', 'Kawasaki')),
  motor_type          TEXT NOT NULL DEFAULT '',
  tenor               INTEGER CHECK (tenor IS NULL OR (tenor BETWEEN 1 AND 32)),
  installment_running INTEGER CHECK (installment_running IS NULL OR installment_running >= 0),
  comm_status         TEXT NOT NULL DEFAULT 'Belum Dihubungi'
                      CHECK (comm_status IN ('Belum Dihubungi', 'Sudah Dihubungi', 'Berminat', 'Tidak Berminat', 'Follow Up Kembali')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_brand ON customers (brand);
CREATE INDEX IF NOT EXISTS idx_customers_tenor ON customers (tenor);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers (comm_status);

-- Akun tambahan untuk petugas di masa depan (admin utama diambil dari environment variable).
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pengaturan aplikasi (mis. template pesan WhatsApp).
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
