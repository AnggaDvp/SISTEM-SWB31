// Utilitas format bersama.

/**
 * Waktu database tersimpan dalam UTC ("YYYY-MM-DD HH:MM:SS").
 * Tampilkan dalam zona Asia/Jakarta.
 */
export function formatJakarta(value: string | null | undefined): string {
  if (!value) return "-";
  const iso = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}
