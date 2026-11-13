import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serverError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daftar riwayat import Excel (terbaru lebih dulu).
export async function GET() {
  try {
    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT id, filename, sheet, total, valid, invalid, duplicate, processed, unprocessed, uploaded_at FROM import_batches ORDER BY id DESC LIMIT 200",
      args: [],
    });
    return NextResponse.json({ batches: res.rows });
  } catch (e) {
    return serverError(e);
  }
}
