// Tipe & konstanta import Excel — dipakai bersama server dan klien.
// Sengaja TANPA dependensi apa pun (termasuk xlsx) agar aman diimpor di browser.

export const IMPORT_FIELDS = [
  { key: "no", label: "NO", hint: "Nomor urut" },
  { key: "faktur", label: "FAKTUR", hint: "Nomor kontrak" },
  { key: "nama", label: "NAMA PEMOHON", hint: "Nama konsumen" },
  { key: "no_hp", label: "NO HP", hint: "Nomor WhatsApp" },
  { key: "chat_wa", label: "CHAT WA", hint: "Hyperlink WhatsApp" },
  { key: "ket_fu", label: "KET FU", hint: "Keterangan follow-up" },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

/** Pemetaan field logis -> indeks kolom (0-based). -1 berarti tidak dipakai. */
export type ColumnMapping = Record<ImportFieldKey, number>;

export type ImportRow = {
  rowNumber: number; // nomor baris pada file (1-based)
  no: string;
  faktur: string;
  nama: string;
  no_hp: string;
  chat_wa: string;
  ket_fu: string;
  extra: string[]; // nilai kolom lain yang tidak dipetakan
};

export type SheetPreview = {
  sheetNames: string[];
  sheet: string;
  headers: string[];
  hasHeader: boolean;
  mapping: ColumnMapping;
  rows: ImportRow[];
  total: number;
};

export const MAX_IMPORT_ROWS = 5000;
