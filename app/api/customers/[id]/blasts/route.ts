import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serverError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Riwayat blast WhatsApp seorang konsumen: jumlah kali dihubungi + waktu terakhir.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
    }
    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT COUNT(*) AS n, MAX(created_at) AS last_at FROM blast_logs WHERE customer_id = ?",
      args: [id],
    });
    const row = res.rows[0] as Record<string, unknown> | undefined;
    return NextResponse.json({
      count: Number(row?.n ?? 0),
      last_at: row?.last_at ? String(row.last_at) : null,
    });
  } catch (e) {
    return serverError(e);
  }
}
