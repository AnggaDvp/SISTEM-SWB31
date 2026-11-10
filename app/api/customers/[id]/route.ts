import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serverError } from "@/lib/api";
import { CUSTOMER_COLS, rowToCustomer } from "@/lib/customers";
import { parseCustomer } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    if (!id) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
    const db = await getDb();
    const res = await db.execute({ sql: `SELECT ${CUSTOMER_COLS} FROM customers WHERE id = ?`, args: [id] });
    if (!res.rows[0]) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ customer: rowToCustomer(res.rows[0]) });
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    if (!id) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
    const parsed = parseCustomer(await req.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const d = parsed.data;

    const db = await getDb();
    const dup = await db.execute({
      sql: "SELECT id, name FROM customers WHERE contract_no = ? AND id <> ?",
      args: [d.contract_no, id],
    });
    if (dup.rows[0]) {
      return NextResponse.json(
        { code: "DUPLICATE", error: `Nomor kontrak ${d.contract_no} sudah dipakai konsumen lain.` },
        { status: 409 },
      );
    }

    const upd = await db.execute({
      sql: `UPDATE customers SET contract_no = ?, name = ?, whatsapp = ?, plate = ?, brand = ?, motor_type = ?,
            tenor = ?, installment_running = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [d.contract_no, d.name, d.whatsapp, d.plate, d.brand, d.motor_type, d.tenor, d.installment_running, id],
    });
    if (upd.rowsAffected === 0) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });

    const res = await db.execute({ sql: `SELECT ${CUSTOMER_COLS} FROM customers WHERE id = ?`, args: [id] });
    return NextResponse.json({ customer: rowToCustomer(res.rows[0]) });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    if (!id) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
    const db = await getDb();
    const res = await db.execute({ sql: "DELETE FROM customers WHERE id = ?", args: [id] });
    if (res.rowsAffected === 0) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
