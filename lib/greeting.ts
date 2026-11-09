/** Salam berdasarkan jam Asia/Jakarta. */
export function getGreeting(now: Date = new Date()): string {
  const hour =
    Number(
      new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(now),
    ) % 24;
  if (hour >= 4 && hour < 11) return "Pagi";
  if (hour >= 11 && hour < 15) return "Siang";
  if (hour >= 15 && hour < 18) return "Sore";
  return "Malam"; // 18.00 - 03.59
}
