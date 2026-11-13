import { NextResponse } from "next/server";
import { serverError } from "@/lib/api";
import { getDb } from "@/lib/db";
import { parseWorkbook, type ColumnMapping } from "@/lib/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// Baca file Excel/CSV dan kembalikan hasil pembacaan TANPA menyimpan ke database.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: "File kosong." }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Ukuran file maksimal 10 MB." }, { status: 400 });
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      return NextResponse.json({ error: "Format harus XLSX, XLS, atau CSV." }, { status: 400 });
    }

    const sheetRaw = form.get("sheet");
    const sheet = typeof sheetRaw === "string" && sheetRaw ? sheetRaw : undefined;

    let mapping: Partial<ColumnMapping> | undefined;
    const mappingRaw = form.get("mapping");
    if (typeof mappingRaw === "string" && mappingRaw) {
      try {
        mapping = JSON.parse(mappingRaw) as Partial<ColumnMapping>;
      } catch {
        mapping = undefined;
      }
    }

    let hasHeader: boolean | undefined;
    const headerRaw = form.get("hasHeader");
    if (headerRaw === "true") hasHeader = true;
    else if (headerRaw === "false") hasHeader = false;

    const buffer = await file.arrayBuffer();
    const preview = parseWorkbook(buffer, { sheet, mapping, hasHeader });

    // Tandai baris yang nomor kontraknya sudah ada di database (calon duplikat).
    let duplicateRowNumbers: number[] = [];
    try {
      const db = await getDb();
      const res = await db.execute({ sql: "SELECT contract_no FROM customers", args: [] });
      const existing = new Set(res.rows.map((r) => String((r as Record<string, unknown>).contract_no)));
      duplicateRowNumbers = preview.rows.filter((r) => r.faktur && existing.has(r.faktur)).map((r) => r.rowNumber);
    } catch {
      duplicateRowNumbers = [];
    }

    return NextResponse.json({ filename: file.name, size: file.size, duplicateRowNumbers, ...preview });
  } catch (e) {
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return serverError(e);
  }
}
