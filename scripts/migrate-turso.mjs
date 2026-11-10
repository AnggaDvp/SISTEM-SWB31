// Menyalin data dari database Turso lama (SOURCE) ke database Turso baru (TARGET).
// Aman: hanya menambah/memperbarui berdasarkan nomor kontrak, TIDAK menghapus data apa pun.
//
// Cara pakai (PowerShell):
//   $env:SOURCE_TURSO_DATABASE_URL="libsql://database-lama.turso.io"
//   $env:SOURCE_TURSO_AUTH_TOKEN="token-database-lama"
//   $env:TARGET_TURSO_DATABASE_URL="libsql://nss-swb31-vercel-....turso.io"
//   $env:TARGET_TURSO_AUTH_TOKEN="token-database-baru"
//   npm run db:migrate
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client/web";

const sourceUrl = process.env.SOURCE_TURSO_DATABASE_URL;
const targetUrl = process.env.TARGET_TURSO_DATABASE_URL;

if (!sourceUrl || !targetUrl) {
  console.error("SOURCE_TURSO_DATABASE_URL dan TARGET_TURSO_DATABASE_URL wajib diatur.");
  process.exit(1);
}

const source = createClient({ url: sourceUrl, authToken: process.env.SOURCE_TURSO_AUTH_TOKEN });
const target = createClient({ url: targetUrl, authToken: process.env.TARGET_TURSO_AUTH_TOKEN });

// Pastikan seluruh tabel tersedia di database tujuan.
const schemaSql = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const schemaStatements = schemaSql
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);
await target.batch(schemaStatements, "write");

const CUSTOMER_COLS = [
  "contract_no",
  "name",
  "whatsapp",
  "plate",
  "brand",
  "motor_type",
  "tenor",
  "installment_running",
  "comm_status",
  "created_at",
].join(", ");

const customers = await source.execute(`SELECT ${CUSTOMER_COLS} FROM customers ORDER BY id ASC`);

const statements = customers.rows.map((row) => ({
  sql: `INSERT INTO customers (${CUSTOMER_COLS})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(contract_no) DO UPDATE SET
          name = excluded.name,
          whatsapp = excluded.whatsapp,
          plate = excluded.plate,
          brand = excluded.brand,
          motor_type = excluded.motor_type,
          tenor = excluded.tenor,
          installment_running = excluded.installment_running,
          comm_status = excluded.comm_status,
          updated_at = datetime('now')`,
  args: [
    String(row.contract_no),
    String(row.name),
    String(row.whatsapp ?? ""),
    String(row.plate ?? ""),
    String(row.brand ?? ""),
    String(row.motor_type ?? ""),
    row.tenor === null || row.tenor === undefined ? null : Number(row.tenor),
    row.installment_running === null || row.installment_running === undefined ? null : Number(row.installment_running),
    String(row.comm_status ?? "Belum Dihubungi"),
    String(row.created_at ?? new Date().toISOString()),
  ],
}));

for (let i = 0; i < statements.length; i += 100) {
  await target.batch(statements.slice(i, i + 100), "write");
}

// Ikut memindahkan pengaturan (template pesan WhatsApp dan gambar poster bila ada).
const settings = await source.execute("SELECT key, value FROM settings");
for (const row of settings.rows) {
  await target.execute({
    sql: `INSERT INTO settings (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: [String(row.key), String(row.value)],
  });
}

console.log(`Selesai. ${statements.length} konsumen dan ${settings.rows.length} pengaturan dipindahkan.`);
console.log("Data yang sudah ada di database tujuan diperbarui, tidak ada yang dihapus.");
