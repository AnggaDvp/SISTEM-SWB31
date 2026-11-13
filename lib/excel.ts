import * as XLSX from "xlsx";
import {
  IMPORT_FIELDS,
  MAX_IMPORT_ROWS,
  type ColumnMapping,
  type ImportRow,
  type SheetPreview,
} from "./import-types";

export { IMPORT_FIELDS, MAX_IMPORT_ROWS };
export type { ColumnMapping, ImportFieldKey, ImportRow, SheetPreview } from "./import-types";

function colName(i: number): string {
  // 0 -> A, 25 -> Z, 26 -> AA ...
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

/** Deteksi otomatis kolom dari baris header. */
export function detectColumns(header: string[]): ColumnMapping {
  const norm = header.map((h) => String(h ?? "").trim().toUpperCase());
  const used = new Set<number>();
  const pick = (test: (v: string) => boolean): number => {
    const i = norm.findIndex((v, idx) => !used.has(idx) && v !== "" && test(v));
    if (i >= 0) used.add(i);
    return i;
  };

  // Urutan penting: kolom yang lebih spesifik dipilih lebih dulu.
  const faktur = pick((v) => /FAKTUR|KONTRAK/.test(v));
  const nama = pick((v) => /NAMA/.test(v));
  const no_hp = pick((v) => /(NO\.?\s*HP|NOMOR\s*HP|\bHP\b|TELP|TELEPON|WHATSAPP|\bWA\b)/.test(v));
  const chat_wa = pick((v) => /CHAT/.test(v));
  const ket_fu = pick((v) => /(KET|KETERANGAN|FOLLOW|\bFU\b)/.test(v));
  const no = pick((v) => /^NO\.?$/.test(v) || /NOMOR\s*URUT/.test(v));

  return { no, faktur, nama, no_hp, chat_wa, ket_fu };
}

/** Pemetaan posisi default (A–F) bila file tidak punya header. */
export function defaultPositionalMapping(): ColumnMapping {
  return { no: 0, faktur: 1, nama: 2, no_hp: 3, chat_wa: 4, ket_fu: 5 };
}

function isHeaderRow(row: string[]): boolean {
  const joined = row.join(" ").toUpperCase();
  return /FAKTUR|KONTRAK/.test(joined) && /NAMA/.test(joined);
}

/** Ambil URL dari sel ber-hyperlink atau formula HYPERLINK(...). */
function extractLink(ws: XLSX.WorkSheet, r: number, c: number): string {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = (ws as Record<string, unknown>)[addr] as
    | { l?: { Target?: string } | string; f?: string; v?: unknown }
    | undefined;
  if (!cell) return "";
  const l = cell.l;
  if (l && typeof l === "object" && typeof l.Target === "string") return l.Target;
  if (typeof l === "string" && l) return l;
  if (typeof cell.f === "string") {
    const m = cell.f.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
    if (m) return m[1];
  }
  return "";
}

/**
 * Baca file Excel (XLSX/XLS/CSV) menjadi data baris + pemetaan kolom.
 * `mapping` (opsional) menimpa hasil deteksi otomatis.
 */
export function parseWorkbook(
  buffer: ArrayBuffer,
  opts: { sheet?: string; mapping?: Partial<ColumnMapping>; hasHeader?: boolean } = {},
): SheetPreview {
  const wb = XLSX.read(buffer, { type: "array", cellDates: false, cellNF: false, cellText: true });
  const sheetNames = wb.SheetNames;
  if (sheetNames.length === 0) throw new Error("File tidak memiliki sheet.");
  const sheet = opts.sheet && sheetNames.includes(opts.sheet) ? opts.sheet : sheetNames[0];
  const ws = wb.Sheets[sheet];

  // raw:false -> pakai teks terformat (menghindari scientific notation & menjaga nol di depan).
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "", blankrows: false });
  const rowsText: string[][] = grid.map((r) => (Array.isArray(r) ? r.map(cellText) : []));
  if (rowsText.length === 0) throw new Error("Sheet kosong.");

  const width = rowsText.reduce((m, r) => Math.max(m, r.length), 0);

  let hasHeader = opts.hasHeader ?? isHeaderRow(rowsText[0]);
  let header: string[];
  let dataStart: number;

  if (hasHeader) {
    header = Array.from({ length: width }, (_, i) => rowsText[0][i] ?? colName(i));
    dataStart = 1;
  } else {
    header = Array.from({ length: width }, (_, i) => colName(i));
    dataStart = 0;
  }

  const detected = hasHeader ? detectColumns(header) : defaultPositionalMapping();
  const mapping: ColumnMapping = { ...detected };
  if (opts.mapping) {
    for (const f of IMPORT_FIELDS) {
      const v = opts.mapping[f.key];
      if (typeof v === "number" && Number.isInteger(v)) mapping[f.key] = v;
    }
  }

  const get = (row: string[], idx: number) => (idx >= 0 && idx < row.length ? row[idx] ?? "" : "");
  const mappedIdx = new Set(Object.values(mapping).filter((i) => i >= 0));

  const rows: ImportRow[] = [];
  for (let r = dataStart; r < rowsText.length && rows.length < MAX_IMPORT_ROWS; r++) {
    const row = rowsText[r];
    const faktur = get(row, mapping.faktur);
    const nama = get(row, mapping.nama);
    const no_hp = get(row, mapping.no_hp);
    const chat_wa = extractLink(ws, r, mapping.chat_wa) || get(row, mapping.chat_wa);
    const ket_fu = get(row, mapping.ket_fu);
    const no = get(row, mapping.no);
    const extra: string[] = [];
    for (let c = 0; c < row.length; c++) {
      if (!mappedIdx.has(c) && row[c]) extra.push(row[c]);
    }
    // Lewati baris kosong.
    if (!faktur && !nama && !no_hp && !ket_fu && extra.length === 0) continue;
    rows.push({ rowNumber: r + 1, no, faktur, nama, no_hp, chat_wa, ket_fu, extra });
  }

  return { sheetNames, sheet, headers: header, hasHeader, mapping, rows, total: rows.length };
}

/** Ubah file yang diunggah menjadi ArrayBuffer (dipakai di route handler). */
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}
