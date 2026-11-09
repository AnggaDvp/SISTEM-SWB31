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

export const MAX_TENOR = 32;

export type Customer = {
  id: number;
  contract_no: string;
  name: string;
  whatsapp: string; // tersimpan dalam format 62xxxxxxxxxx bila valid
  wa_valid: boolean;
  plate: string;
  brand: string;
  motor_type: string;
  tenor: number | null;
  installment_running: number | null;
  remaining: number | null; // dihitung: tenor - angsuran berjalan
  comm_status: string;
  created_at: string;
  updated_at: string;
};

export type CustomerInput = {
  contract_no: string;
  name: string;
  whatsapp: string;
  plate: string;
  brand: string;
  motor_type: string;
  tenor: number | null;
  installment_running: number | null;
};
