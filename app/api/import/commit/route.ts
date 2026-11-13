import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serverError } from "@/lib/api";
import { UPSERT_SQL } from "@/lib/customers";
import { normalizePhone } from "@/lib/validation";
import { MAX_IMPORT_ROWS } from "@/lib/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingRow = {
  faktur?: unknown;
  nama?: unknown;
  no_hp?: unknown;
  ket_fu?: unknown;
};

type CommitBody = { filename?: unknown; sheet?: unknown; rows?: unknown };

// Simpan baris yang sudah dikonfirmasi admin ke database + catat batch import.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as CommitBody | null;
    const filename = typeof body?.filename === "string" ? body.filename.slice(0, 200) : "import";
    const sheet = typeof body?.sheet === "string" ? body.sheet.slice(0, 100) : "";
    const rawRows = Array.isArray(body?.rows) ? (body.rows as IncomingRow[]) : null;

    if (!rawRows) return NextResponse.json({ error: "Data baris tidak valid." }, { status: 400 });
    if (rawRows.length === 0) return NextResponse.json({ error: "Tidak ada baris untuk disimpan." }, { status: 400 });
    if (rawRows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `Maksimal ${MAX_IMPORT_ROWS} baris per import.` }, { status: 400 });
    }

    const str = (v: unknown, max: number) => (v == null ? "" : String(v).trim()).slice(0, max);
    const cleaned = rawRows.map((r) => {
      const rawPhone = str(r?.no_hp, 20);
      return {
        contract_no: str(r?.faktur, 50),
        name: str(r?.nama, 120),
        raw_phone: rawPhone,
        whatsapp: normalizePhone(rawPhone).slice(0, 20),
        ket_fu: str(r?.ket_fu, 200),
      };
    });

    const db = await getDb();

    // Kumpulkan nomor kontrak yang sudah ada (deteksi duplikat).
    const existing = new Set<string>();
    const res = await db.execute({ sql: "SELECT contract_no FROM customers", args: [] });
    for (const row of res.rows) existing.add(String((row as Record<string, unknown>).contract_no));

    let invalid = 0;
    let duplicate = 0;
    const seen = new Set<string>();
    const toInsert: typeof cleaned = [];
    for (const c of cleaned) {
      if (!c.contract_no || !c.name) {
        invalid++;
        continue;
      }
      if (existing.has(c.contract_no) || seen.has(c.contract_no)) {
        duplicate++;
        continue;
      }
      seen.add(c.contract_no);
      toInsert.push(c);
    }

    // Catat batch import (total = jumlah baris yang diproses).
    const ins = await db.execute({
      sql: `INSERT INTO import_batches (filename, sheet, total, valid, invalid, duplicate, processed, unprocessed)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      args: [filename, sheet, cleaned.length, toInsert.length, invalid, duplicate, toInsert.length],
    });
    const batchId = Number(ins.lastInsertRowid ?? 0);

    let inserted = 0;
    for (const c of toInsert) {
      await db.execute({
        sql: UPSERT_SQL,
        args: [c.contract_no, c.name, c.whatsapp, c.raw_phone, c.ket_fu, "", "", null, null],
      });
      await db.execute({
        sql: "UPDATE customers SET batch_id = ?, wa_status = 'Belum Diproses', updated_at = datetime('now') WHERE contract_no = ?",
        args: [batchId, c.contract_no],
      });
      inserted++;
    }

    return NextResponse.json({
      batch_id: batchId,
      total: cleaned.length,
      inserted,
      invalid,
      duplicate,
    });
  } catch (e) {
    return serverError(e);
  }
}
