// Membuat tabel dari db/schema.sql ke database Turso. Jalankan: npm run db:init
// (Opsional: aplikasi juga membuat tabel otomatis saat pertama kali dipakai.)
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client/web";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL belum diatur (isi .env.local).");
  process.exit(1);
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const sql = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = sql
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

await db.batch(statements, "write");
console.log(`Selesai: ${statements.length} perintah SQL dijalankan.`);
