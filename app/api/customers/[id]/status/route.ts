import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serverError } from "@/lib/api";
import { CUSTOMER_COLS, rowToCustomer } from "@/lib/customers";
import { STATUSES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

    const body = (await req.json().catch(() => null)) as { comm_status?: unknown } | null;
    const status = typeof body?.comm_status === "string" ? body.comm_status : "";
    if (!(STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
    }

    const db = await getDb();
    const upd = await db.execute({
      sql: "UPDATE customers SET comm_status = ?, updated_at = datetime('now') WHERE id = ?",
      args: [status, id],
    });
    if (upd.rowsAffected === 0) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });

    const res = await db.execute({ sql: `SELECT ${CUSTOMER_COLS} FROM customers WHERE id = ?`, args: [id] });
    return NextResponse.json({ customer: rowToCustomer(res.rows[0]) });
  } catch (e) {
    return serverError(e);
  }
}
