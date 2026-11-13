import { createClient, type Client } from "@libsql/client/web";
import { SCHEMA_STATEMENTS, migrateBrandConstraint, migrateExtraColumns } from "./schema";

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
      await migrateBrandConstraint(client);
      await client.batch(SCHEMA_STATEMENTS, "write");
      // Migrasi: tambah kolom baru (ket_fu, wa_status, batch_id, status blast, dll.) pada DB lama.
      await migrateExtraColumns(client);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  await ready;
  return client;
}
