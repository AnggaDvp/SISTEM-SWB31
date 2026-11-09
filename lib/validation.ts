import { BRANDS, MAX_TENOR, type CustomerInput } from "./types";

const WA_VALID = /^628\d{8,11}$/;

/** Ubah 08..., 62..., +62..., 8... menjadi 62...; karakter pemisah dibuang. */
export function normalizePhone(raw: string): string {
  let s = (raw ?? "").trim().replace(/[\s\-().]/g, "");
  if (!s) return "";
  if (s.startsWith("+")) s = s.slice(1);
  if (!/^\d+$/.test(s)) return s; // biarkan apa adanya, akan ditandai tidak valid
  if (s.startsWith("0")) s = "62" + s.slice(1);
  else if (s.startsWith("8")) s = "62" + s;
  return s;
}

export function isWhatsappValid(stored: string): boolean {
  return WA_VALID.test(stored ?? "");
}

/** 62812... -> 0812... untuk tampilan. */
export function displayPhone(stored: string): string {
  if (!stored) return "";
  return /^62\d+$/.test(stored) ? "0" + stored.slice(2) : stored;
}

export function normalizePlate(raw: string): string {
  return (raw ?? "").toUpperCase().replace(/\s+/g, " ").trim();
}

function toIntOrNull(v: unknown): number | null | "invalid" {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) return "invalid";
  return n;
}

export type ParseResult = { ok: true; data: CustomerInput } | { ok: false; error: string };

export function parseCustomer(body: unknown): ParseResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Data tidak valid." };
  const b = body as Record<string, unknown>;
  const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string).trim() : b[k] == null ? "" : String(b[k]).trim());

  const contract_no = str("contract_no");
  const name = str("name");
  if (!contract_no) return { ok: false, error: "Nomor Kontrak wajib diisi." };
  if (contract_no.length > 50) return { ok: false, error: "Nomor Kontrak terlalu panjang." };
  if (!name) return { ok: false, error: "Nama Konsumen wajib diisi." };
  if (name.length > 120) return { ok: false, error: "Nama Konsumen terlalu panjang." };

  const whatsapp = normalizePhone(str("whatsapp"));
  if (whatsapp.length > 20) return { ok: false, error: "Nomor WhatsApp terlalu panjang." };

  const plate = normalizePlate(str("plate"));
  if (plate.length > 20) return { ok: false, error: "Plat nomor terlalu panjang." };

  const brand = str("brand");
  if (brand && !(BRANDS as readonly string[]).includes(brand)) {
    return { ok: false, error: "Merek motor harus Honda, Yamaha, atau Kawasaki." };
  }

  const motor_type = str("motor_type");
  if (motor_type.length > 80) return { ok: false, error: "Tipe motor terlalu panjang." };

  const tenor = toIntOrNull(b.tenor);
  if (tenor === "invalid") return { ok: false, error: "Tenor harus berupa angka." };
  if (tenor !== null && (tenor < 1 || tenor > MAX_TENOR)) {
    return { ok: false, error: `Tenor hanya boleh 1 sampai ${MAX_TENOR} bulan.` };
  }

  const running = toIntOrNull(b.installment_running);
  if (running === "invalid") return { ok: false, error: "Angsuran berjalan harus berupa angka." };
  if (running !== null) {
    if (running < 0) return { ok: false, error: "Angsuran berjalan tidak boleh negatif." };
    if (tenor === null) return { ok: false, error: "Pilih tenor terlebih dahulu." };
    if (running > tenor) return { ok: false, error: "Angsuran berjalan tidak boleh lebih besar dari tenor." };
  }

  return {
    ok: true,
    data: { contract_no, name, whatsapp, plate, brand, motor_type, tenor, installment_running: running },
  };
}
