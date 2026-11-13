import { getGreeting } from "./greeting";

export const TEMPLATE_KEY = "wa_template";
export const WA_IMAGE_KEY = "wa_image";
export const WA_IMAGE_NAME_KEY = "wa_image_name";

// Batas ukuran gambar poster yang disimpan sebagai data URL (base64) di database.
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

export const DEFAULT_TEMPLATE = `Selamat {KONDISI_SALAM} Bapak/Ibu {NAMA_KONSUMEN} 🙏 Dengan Nomor Kontrak {NOMOR_KONTRAK}.

Saya Admin NSC Finance NSS. Selamat Bapak/Ibu terpilih untuk PROGRAM TOP UP NSC PROMO NSS VAGANZA!! S&K berlaku.

TOP UP ini dimaksudkan untuk menawarkan pinjaman dana tunai dengan angsuran Bapak/Ibu yang masih berjalan dengan jaminan BPKB motor Bapak/Ibu.

🥳 BERIKUT PROMO UNTUK BULAN INI DI PROMO NSS VAGANZA!

Dan dapatkan juga PROMO:

*POTONGAN ANGSURAN bisa sampai 20–50rb*

*POTONGAN BUNGA UNTUK BAPAK/IBU DI PROMO SERU 1–2%*

*PROSES CEPAT 1 JAM, DANA CAIR BISA TRANSFER ATAU TUNAI*

Note: Sisa angsuran dan denda bisa dipotong saat pencairan sesuai ketentuan.

Berminat pengajuan di bulan ini? Dapatkan keuntungan yang luar biasa! BALAS "IYA" untuk pengajuan promo bulan ini bersama NSC Finance.`;

// Penanda yang bisa disisipkan ke template. Mendukung penamaan lama dan baru.
export const PLACEHOLDERS = [
  "{KONDISI_SALAM}",
  "{NAMA_PEMOHON}",
  "{FAKTUR}",
  "{NO_HP}",
  "{NAMA_KONSUMEN}",
  "{NOMOR_KONTRAK}",
] as const;

export function buildMessage(
  template: string,
  data: { name: string; contract_no: string; phone?: string },
  now: Date = new Date(),
): string {
  return template
    .replace(/\{KONDISI_SALAM\}/gi, () => getGreeting(now))
    .replace(/\{NAMA_(?:KONSUMEN|PEMOHON)\}/gi, () => data.name)
    .replace(/\{(?:NOMOR_)?KONTRAK\}|\{FAKTUR\}/gi, () => data.contract_no)
    .replace(/\{NO_HP\}/gi, () => data.phone ?? "");
}
