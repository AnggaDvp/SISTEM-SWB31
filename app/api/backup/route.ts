import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serverError } from "@/lib/api";
import { CUSTOMER_COLS, rowToCustomer } from "@/lib/customers";
import { parseCustomer } from "@/lib/validation";
import { STATUSES } from "@/lib/types";
import { TEMPLATE_KEY } from "@/lib/template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Backup penuh (JSON): seluruh konsumen + template pesan.
export async function GET(req: Request) {
  try {
    const db = await getDb();
    const [cust, tpl] = await Promise.all([
      db.execute(`SELECT ${CUSTOMER_COLS} FROM customers ORDER BY id ASC`),
      db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [TEMPLATE_KEY] }),
    ]);
    const payload = {
      app: "SYSTEM NSS SWB31",
      version: 1,
      exported_at: new Date().toISOString(),
      template: tpl.rows[0] ? String(tpl.rows[0].value) : null,
      customers: cust.rows.map((r) => {
        const c = rowToCustomer(r);
        return {
          contract_no: c.contract_no,
          name: c.name,
          whatsapp: c.whatsapp,
          plate: c.plate,
          brand: c.brand,
          motor_type: c.motor_type,
          tenor: c.tenor,
          installment_running: c.installment_running,
          comm_status: c.comm_status,
          created_at: c.created_at,
        };
      }),
    };
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="nss-swb31-backup-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return serverError(e);
  }
}

// Pulihkan dari file backup JSON. Bersifat menambah/memperbarui berdasarkan nomor kontrak,
// TIDAK menghapus data yang sudah ada.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { customers?: unknown; template?: unknown } | null;
    if (!body || !Array.isArray(body.customers)) {
      return NextResponse.json({ error: "File backup tidak valid." }, { status: 400 });
    }
    if (body.customers.length > 20000) {
      return NextResponse.json({ error: "Jumlah data terlalu besar (maks 20.000)." }, { status: 400 });
    }

    const stmts: { sql: string; args: (string | number | null)[] }[] = [];
    let skipped = 0;
    for (const item of body.customers) {
      const parsed = parseCustomer(item);
      if (!parsed.ok) {
        skipped += 1;
        continue;
      }
      const d = parsed.data;
      const rawStatus = (item as Record<string, unknown>).comm_status;
      const status =
        typeof rawStatus === "string" && (STATUSES as readonly string[]).includes(rawStatus)
          ? rawStatus
          : "Belum Dihubungi";
      stmts.push({
        sql: `INSERT INTO customers (contract_no, name, whatsapp, plate, brand, motor_type, tenor, installment_running, comm_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(contract_no) DO UPDATE SET
                name = excluded.name, whatsapp = excluded.whatsapp, plate = excluded.plate, brand = excluded.brand,
                motor_type = excluded.motor_type, tenor = excluded.tenor,
                installment_running = excluded.installment_running, comm_status = excluded.comm_status,
                updated_at = datetime('now')`,
        args: [d.contract_no, d.name, d.whatsapp, d.plate, d.brand, d.motor_type, d.tenor, d.installment_running, status],
      });
    }

    const db = await getDb();
    for (let i = 0; i < stmts.length; i += 100) {
      await db.batch(stmts.slice(i, i + 100), "write");
    }
    if (typeof body.template === "string" && body.template.trim() && body.template.length <= 4000) {
      await db.execute({
        sql: `INSERT INTO settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        args: [TEMPLATE_KEY, body.template],
      });
    }
    return NextResponse.json({ restored: stmts.length, skipped });
  } catch (e) {
    return serverError(e);
  }
}
