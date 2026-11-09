import type { Row } from "@libsql/client/web";
import { displayPhone, isWhatsappValid } from "./validation";
import type { Customer } from "./types";

export const CUSTOMER_COLS =
  "id, contract_no, name, whatsapp, plate, brand, motor_type, tenor, installment_running, comm_status, created_at, updated_at";

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export function rowToCustomer(row: Row): Customer {
  const r = row as unknown as Record<string, unknown>;
  const tenor = num(r.tenor);
  const running = num(r.installment_running);
  const whatsapp = String(r.whatsapp ?? "");
  return {
    id: Number(r.id),
    contract_no: String(r.contract_no),
    name: String(r.name),
    whatsapp,
    wa_valid: isWhatsappValid(whatsapp),
    plate: String(r.plate ?? ""),
    brand: String(r.brand ?? ""),
    motor_type: String(r.motor_type ?? ""),
    tenor,
    installment_running: running,
    remaining: tenor !== null && running !== null ? tenor - running : null,
    comm_status: String(r.comm_status),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export { displayPhone };

export const UPSERT_SQL = `INSERT INTO customers (contract_no, name, whatsapp, plate, brand, motor_type, tenor, installment_running)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(contract_no) DO UPDATE SET
  name = excluded.name,
  whatsapp = excluded.whatsapp,
  plate = excluded.plate,
  brand = excluded.brand,
  motor_type = excluded.motor_type,
  tenor = excluded.tenor,
  installment_running = excluded.installment_running,
  updated_at = datetime('now')`;

export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => "\\" + c);
}

/** Cegah formula injection saat CSV dibuka di Excel. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
