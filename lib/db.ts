import { createClient, type Client } from "@libsql/client/web";
import { SCHEMA_TABLES, SCHEMA_INDEXES, migrateBrandConstraint, migrateExtraColumns } from "./schema";

// Hanya dipakai di server (API routes / server components). Token tidak pernah dikirim ke browser.
let client: Client | null = null;
let ready: Promise<void> | null = null;

export async function getDb(): Promise<Client> {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL belum diatur");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  if (!ready) {
    ready = (async () => {
      // Migrasi: longgarkan CHECK brand lama (Honda/Yamaha/Kawasaki) agar menerima merek baru.
      await migrateBrandConstraint(client!);
      // 1) Buat tabel yang belum ada (tanpa indeks).
      await client!.batch(SCHEMA_TABLES, "write");
      // 2) Tambah kolom baru (ket_fu, wa_status, batch_id, status blast, dll.) pada DB lama.
      await migrateExtraColumns(client!);
      // 3) Baru buat indeks — termasuk indeks pada kolom baru yang sudah dipastikan ada.
      await client!.batch(SCHEMA_INDEXES, "write");
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  await ready;
  return client;
}
