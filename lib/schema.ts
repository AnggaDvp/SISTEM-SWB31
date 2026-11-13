// Salinan dari db/schema.sql — dijalankan otomatis (IF NOT EXISTS) saat database pertama kali dipakai.
// Kolom brand sengaja TANPA CHECK constraint agar daftar merek bisa diperluas tanpa migrasi ulang.
// PENTING (urutan migrasi): tabel dibuat lebih dahulu TANPA indeks, lalu kolom baru pada
// database lama ditambahkan (migrateExtraColumns), baru indeks dibuat. Bila indeks pada kolom
// baru (wa_status, batch_id) dibuat sebelum kolomnya ada, batch akan gagal dan seluruh API error.
export const SCHEMA_TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS customers (
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
    installment_running INTEGER CHECK (installment_running IS NULL OR (installment_running >= 0)),
    comm_status         TEXT NOT NULL DEFAULT 'Belum Dihubungi'
                        CHECK (comm_status IN ('Belum Dihubungi', 'Sudah Dihubungi', 'Berminat', 'Tidak Berminat', 'Follow Up Kembali')),
    wa_status           TEXT NOT NULL DEFAULT 'Belum Diproses'
                        CHECK (wa_status IN ('Belum Diproses', 'WhatsApp Dibuka', 'Selesai Dikonfirmasi', 'Gagal', 'Dilewati')),
    batch_id            INTEGER,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'staff',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Riwayat tiap proses import Excel.
  `CREATE TABLE IF NOT EXISTS import_batches (
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
  )`,
  // Log aksi blast WhatsApp (setiap kali tombol Chat ditekan) + status proses & admin.
  `CREATE TABLE IF NOT EXISTS blast_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    status      TEXT NOT NULL DEFAULT 'WhatsApp Dibuka',
    admin       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

// Indeks dibuat paling akhir, setelah semua kolom dipastikan tersedia.
export const SCHEMA_INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_brand ON customers (brand)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_tenor ON customers (tenor)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_status ON customers (comm_status)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_wa_status ON customers (wa_status)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_batch ON customers (batch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_import_batches_time ON import_batches (uploaded_at)`,
  `CREATE INDEX IF NOT EXISTS idx_blast_logs_created ON blast_logs (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_blast_logs_customer ON blast_logs (customer_id)`,
];

// Migrasi: tabel customers lama membatasi brand ke Honda/Yamaha/Kawasaki.
// Jika ditemukan, buat tabel baru tanpa CHECK brand, pindahkan data, lalu ganti nama.
// Aman dijalankan berulang: hanya berjalan bila tabel masih punya constraint brand lama.
export async function migrateBrandConstraint(db: { execute: (sql: string | { sql: string }) => Promise<{ rows: unknown[] }> }) {
  const res = await db.execute({ sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name='customers'" });
  const sql = res.rows[0] ? String((res.rows[0] as Record<string, unknown>).sql ?? "") : "";
  const hasOldCheck = /brand[^,]*CHECK\s*\([^)]*Honda[^)]*Yamaha/i.test(sql) || sql.includes("'Honda', 'Yamaha', 'Kawasaki'");
  if (!hasOldCheck) return;

  await db.execute({
    sql: `CREATE TABLE customers_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_no TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      whatsapp TEXT NOT NULL DEFAULT '',
      raw_phone TEXT NOT NULL DEFAULT '',
      ket_fu TEXT NOT NULL DEFAULT '',
      plate TEXT NOT NULL DEFAULT '',
      brand TEXT NOT NULL DEFAULT '',
      motor_type TEXT NOT NULL DEFAULT '',
      tenor INTEGER CHECK (tenor IS NULL OR (tenor BETWEEN 1 AND 32)),
      installment_running INTEGER CHECK (installment_running IS NULL OR installment_running >= 0),
      comm_status TEXT NOT NULL DEFAULT 'Belum Dihubungi' CHECK (comm_status IN ('Belum Dihubungi', 'Sudah Dihubungi', 'Berminat', 'Tidak Berminat', 'Follow Up Kembali')),
      wa_status TEXT NOT NULL DEFAULT 'Belum Diproses' CHECK (wa_status IN ('Belum Diproses', 'WhatsApp Dibuka', 'Selesai Dikonfirmasi', 'Gagal', 'Dilewati')),
      batch_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  });
  await db.execute({
    sql: "INSERT INTO customers_new (id, contract_no, name, whatsapp, plate, brand, motor_type, tenor, installment_running, comm_status, created_at, updated_at) SELECT id, contract_no, name, whatsapp, plate, brand, motor_type, tenor, installment_running, comm_status, created_at, updated_at FROM customers",
  });
  await db.execute({ sql: "DROP TABLE customers" });
  await db.execute({ sql: "ALTER TABLE customers_new RENAME TO customers" });
}

type DbLike = { execute: (sql: string | { sql: string }) => Promise<{ rows: unknown[] }> };

/** Tambah kolom baru yang mungkin belum ada pada database lama (ALTER TABLE ADD COLUMN). */
export async function migrateExtraColumns(db: DbLike) {
  const existing = async (table: string): Promise<Set<string>> => {
    const res = await db.execute({ sql: `PRAGMA table_info(${table})` });
    return new Set(res.rows.map((r) => String((r as Record<string, unknown>).name)));
  };

  const custCols = await existing("customers");
  const custAdds: [string, string][] = [
    ["raw_phone", "ALTER TABLE customers ADD COLUMN raw_phone TEXT NOT NULL DEFAULT ''"],
    ["ket_fu", "ALTER TABLE customers ADD COLUMN ket_fu TEXT NOT NULL DEFAULT ''"],
    ["wa_status", "ALTER TABLE customers ADD COLUMN wa_status TEXT NOT NULL DEFAULT 'Belum Diproses'"],
    ["batch_id", "ALTER TABLE customers ADD COLUMN batch_id INTEGER"],
  ];
  for (const [name, sql] of custAdds) {
    if (!custCols.has(name)) await db.execute({ sql });
  }

  const blastCols = await existing("blast_logs");
  if (!blastCols.has("status")) {
    await db.execute({ sql: "ALTER TABLE blast_logs ADD COLUMN status TEXT NOT NULL DEFAULT 'WhatsApp Dibuka'" });
  }
  if (!blastCols.has("admin")) {
    await db.execute({ sql: "ALTER TABLE blast_logs ADD COLUMN admin TEXT NOT NULL DEFAULT ''" });
  }
}
