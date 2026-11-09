import { createClient, type Client } from "@libsql/client/web";
import { SCHEMA_STATEMENTS } from "./schema";

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
    ready = client
      .batch(SCHEMA_STATEMENTS, "write")
      .then(() => undefined)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  await ready;
  return client;
}
