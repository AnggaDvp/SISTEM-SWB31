export const BRANDS = ["Honda", "Yamaha", "Kawasaki"] as const;
export type Brand = (typeof BRANDS)[number];

export const STATUSES = [
  "Belum Dihubungi",
  "Sudah Dihubungi",
  "Berminat",
  "Tidak Berminat",
  "Follow Up Kembali",
] as const;
export type CommStatus = (typeof STATUSES)[number];

// Status proses WhatsApp Blast (terpisah dari status komunikasi di atas).
export const WA_STATUSES = [
  "Belum Diproses",
  "WhatsApp Dibuka",
  "Selesai Dikonfirmasi",
  "Gagal",
  "Dilewati",
] as const;
export type WaStatus = (typeof WA_STATUSES)[number];

export const MAX_TENOR = 32;

export type Customer = {
  id: number;
  contract_no: string;
  name: string;
  whatsapp: string; // tersimpan dalam format 62xxxxxxxxxx bila valid
  raw_phone: string; // nomor asli dari Excel sebelum dinormalisasi
  wa_valid: boolean;
  plate: string;
  brand: string;
  motor_type: string;
  tenor: number | null;
  installment_running: number | null;
  remaining: number | null; // dihitung: tenor - angsuran berjalan
  comm_status: string;
  wa_status: string; // status proses WhatsApp
  ket_fu: string; // keterangan follow-up dari Excel
  batch_id: number | null; // id batch import (null bila input manual)
  created_at: string;
  updated_at: string;
};

export type CustomerInput = {
  contract_no: string;
  name: string;
  whatsapp: string;
  raw_phone?: string;
  plate: string;
  brand: string;
  motor_type: string;
  tenor: number | null;
  installment_running: number | null;
  ket_fu?: string;
};
