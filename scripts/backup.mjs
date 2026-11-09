// Backup database ke file JSON (hanya membaca, tidak mengubah/menghapus data).
// Jalankan: npm run db:backup   -> menghasilkan backups/backup-YYYY-MM-DD.json
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@libsql/client/web";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL belum diatur.");
  process.exit(1);
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const customers = await db.execute(
  "SELECT contract_no, name, whatsapp, plate, brand, motor_type, tenor, installment_running, comm_status, created_at FROM customers ORDER BY id ASC",
);
const tpl = await db.execute("SELECT value FROM settings WHERE key = 'wa_template'");

const payload = {
  app: "SYSTEM NSS SWB31",
  version: 1,
  exported_at: new Date().toISOString(),
  template: tpl.rows[0] ? String(tpl.rows[0].value) : null,
  customers: customers.rows.map((r) => ({ ...r })),
};

mkdirSync("backups", { recursive: true });
const file = `backups/backup-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(file, JSON.stringify(payload, null, 2));
console.log(`Backup tersimpan: ${file} (${payload.customers.length} konsumen)`);
