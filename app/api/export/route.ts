import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serverError } from "@/lib/api";
import { CUSTOMER_COLS, csvCell, rowToCustomer } from "@/lib/customers";
import { displayPhone } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Export CSV (UTF-8 + BOM, bisa dibuka langsung di Excel).
export async function GET(req: Request) {
  try {
    const db = await getDb();
    const res = await db.execute(`SELECT ${CUSTOMER_COLS} FROM customers ORDER BY id ASC`);
    const header = [
      "Nomor Kontrak",
      "Nama Konsumen",
      "Nomor WhatsApp",
      "Nomor HP Asli",
      "KET FU",
      "Plat Motor",
      "Merek",
      "Tipe Motor",
      "Tenor (Bulan)",
      "Angsuran Berjalan",
      "Sisa Angsuran",
      "Status Komunikasi",
      "Status Proses WA",
      "Tanggal Input (UTC)",
    ];
    const lines = [header.map(csvCell).join(",")];
    for (const row of res.rows) {
      const c = rowToCustomer(row);
      lines.push(
        [
          c.contract_no,
          c.name,
          displayPhone(c.whatsapp),
          c.raw_phone,
          c.ket_fu,
          c.plate,
          c.brand,
          c.motor_type,
          c.tenor,
          c.installment_running,
          c.remaining,
          c.comm_status,
          c.wa_status,
          c.created_at,
        ]
          .map(csvCell)
          .join(","),
      );
    }
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse("﻿" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nss-swb31-konsumen-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
