import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serverError } from "@/lib/api";
import { CUSTOMER_COLS, escapeLike, rowToCustomer, UPSERT_SQL } from "@/lib/customers";
import { parseCustomer } from "@/lib/validation";
import { BRANDS, STATUSES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS: Record<string, string> = {
  newest: "created_at DESC, id DESC",
  oldest: "created_at ASC, id ASC",
  name_asc: "name COLLATE NOCASE ASC, id ASC",
  name_desc: "name COLLATE NOCASE DESC, id DESC",
};

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const q = (sp.get("q") ?? "").trim().slice(0, 100);
    const brand = sp.get("brand") ?? "";
    const tenor = sp.get("tenor") ?? "";
    const status = sp.get("status") ?? "";
    const wa = sp.get("wa") ?? ""; // valid | empty | invalid
    const orderBy = SORTS[sp.get("sort") ?? "newest"] ?? SORTS.newest;

    const where: string[] = [];
    const args: (string | number)[] = [];

    if (q) {
      const like = `%${escapeLike(q)}%`;
      const waQ = q.startsWith("0") ? "62" + q.slice(1) : q.replace(/^\+/, "");
      const plateQ = `%${escapeLike(q.replace(/\s+/g, ""))}%`;
      where.push(
        `(contract_no LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' OR whatsapp LIKE ? ESCAPE '\\' OR whatsapp LIKE ? ESCAPE '\\' OR REPLACE(plate, ' ', '') LIKE ? ESCAPE '\\')`,
      );
      args.push(like, like, like, `%${escapeLike(waQ)}%`, plateQ);
    }
    if (brand && (BRANDS as readonly string[]).includes(brand)) {
      where.push("brand = ?");
      args.push(brand);
    }
    const tenorN = Number(tenor);
    if (tenor && Number.isInteger(tenorN) && tenorN >= 1 && tenorN <= 32) {
      where.push("tenor = ?");
      args.push(tenorN);
    }
    if (status && (STATUSES as readonly string[]).includes(status)) {
      where.push("comm_status = ?");
      args.push(status);
    }

    const db = await getDb();
    const res = await db.execute({
      sql: `SELECT ${CUSTOMER_COLS} FROM customers ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${orderBy}`,
      args,
    });
    let customers = res.rows.map(rowToCustomer);

    if (wa === "valid") customers = customers.filter((c) => c.wa_valid);
    else if (wa === "empty") customers = customers.filter((c) => !c.whatsapp);
    else if (wa === "invalid") customers = customers.filter((c) => c.whatsapp && !c.wa_valid);

    return NextResponse.json({ customers });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const parsed = parseCustomer(await req.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const d = parsed.data;
    const overwrite = new URL(req.url).searchParams.get("overwrite") === "true";

    const db = await getDb();
    if (!overwrite) {
      const exist = await db.execute({
        sql: "SELECT id, name FROM customers WHERE contract_no = ?",
        args: [d.contract_no],
      });
      if (exist.rows[0]) {
        return NextResponse.json(
          {
            code: "DUPLICATE",
            error: `Nomor kontrak ${d.contract_no} sudah ada atas nama ${String(exist.rows[0].name)}.`,
          },
          { status: 409 },
        );
      }
    }

    await db.execute({
      sql: UPSERT_SQL,
      args: [d.contract_no, d.name, d.whatsapp, d.plate, d.brand, d.motor_type, d.tenor, d.installment_running],
    });
    const saved = await db.execute({
      sql: `SELECT ${CUSTOMER_COLS} FROM customers WHERE contract_no = ?`,
      args: [d.contract_no],
    });
    return NextResponse.json({ customer: rowToCustomer(saved.rows[0]) }, { status: overwrite ? 200 : 201 });
  } catch (e) {
    return serverError(e);
  }
}
