import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serverError } from "@/lib/api";
import { WA_STATUSES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Riwayat WhatsApp Blast (join dengan data konsumen).
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const limitRaw = Number(sp.get("limit"));
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;

    const db = await getDb();
    const res = await db.execute({
      sql: `SELECT b.id, b.customer_id, b.status, b.admin, b.created_at,
                   c.name, c.contract_no, c.whatsapp
            FROM blast_logs b
            JOIN customers c ON c.id = b.customer_id
            ORDER BY b.id DESC
            LIMIT ?`,
      args: [limit],
    });
    return NextResponse.json({ logs: res.rows });
  } catch (e) {
    return serverError(e);
  }
}

// Catat satu aksi/status proses WhatsApp (dipanggil saat membuka chat atau menandai status).
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { customer_id?: unknown; status?: unknown; admin?: unknown }
      | null;
    const customerId = Number(body?.customer_id);
    if (!Number.isFinite(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "customer_id tidak valid." }, { status: 400 });
    }

    const status = (WA_STATUSES as readonly string[]).includes(String(body?.status))
      ? String(body?.status)
      : "WhatsApp Dibuka";
    const admin = typeof body?.admin === "string" ? body.admin.trim().slice(0, 80) : "";

    const db = await getDb();
    await db.execute({
      sql: "INSERT INTO blast_logs (customer_id, status, admin) VALUES (?, ?, ?)",
      args: [customerId, status, admin],
    });
    // Sinkronkan status proses terakhir ke data konsumen.
    await db.execute({
      sql: "UPDATE customers SET wa_status = ?, updated_at = datetime('now') WHERE id = ?",
      args: [status, customerId],
    });

    return NextResponse.json({ ok: true, status }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
