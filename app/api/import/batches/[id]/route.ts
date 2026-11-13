import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serverError } from "@/lib/api";
import { CUSTOMER_COLS, rowToCustomer } from "@/lib/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Detail satu batch import: info batch + seluruh konsumen dari batch tersebut.
export async function GET(req: Request, ctx: Ctx) {
  try {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

    const db = await getDb();
    const batchRes = await db.execute({
      sql: "SELECT id, filename, sheet, total, valid, invalid, duplicate, processed, unprocessed, uploaded_at FROM import_batches WHERE id = ?",
      args: [id],
    });
    if (!batchRes.rows[0]) return NextResponse.json({ error: "Batch tidak ditemukan." }, { status: 404 });

    const rowsRes = await db.execute({
      sql: `SELECT ${CUSTOMER_COLS} FROM customers WHERE batch_id = ? ORDER BY id ASC`,
      args: [id],
    });

    return NextResponse.json({
      batch: batchRes.rows[0],
      customers: rowsRes.rows.map(rowToCustomer),
    });
  } catch (e) {
    return serverError(e);
  }
}
