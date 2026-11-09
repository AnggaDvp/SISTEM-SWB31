// Master tipe motor (daftar awal). Ganti/tambah sesuai file Excel master perusahaan.
// Pengguna tetap bisa mengetik tipe motor secara manual jika tidak ada di daftar.
export type MotorType = { brand: "Honda" | "Yamaha" | "Kawasaki"; name: string; aliases?: string[] };

export const MOTOR_TYPES: MotorType[] = [
  // Honda
  { brand: "Honda", name: "BeAT", aliases: ["beat esp", "bit"] },
  { brand: "Honda", name: "BeAT Street", aliases: ["beat street"] },
  { brand: "Honda", name: "Scoopy", aliases: ["scopy", "skupi"] },
  { brand: "Honda", name: "Vario 110", aliases: ["vario"] },
  { brand: "Honda", name: "Vario 125", aliases: ["vario esp", "vario techno 125"] },
  { brand: "Honda", name: "Vario 150", aliases: ["vario 150 esp"] },
  { brand: "Honda", name: "Vario 160", aliases: ["all new vario 160"] },
  { brand: "Honda", name: "Genio", aliases: ["genio cbs"] },
  { brand: "Honda", name: "Stylo 160", aliases: ["stylo"] },
  { brand: "Honda", name: "PCX 160", aliases: ["pcx", "pcx 150"] },
  { brand: "Honda", name: "ADV 160", aliases: ["adv", "adv 150"] },
  { brand: "Honda", name: "Forza 250", aliases: ["forza"] },
  { brand: "Honda", name: "Spacy", aliases: ["spacy fi"] },
  { brand: "Honda", name: "Revo", aliases: ["revo fit", "revo absolute", "absolute revo"] },
  { brand: "Honda", name: "Supra X 125", aliases: ["supra x", "supra"] },
  { brand: "Honda", name: "Supra GTR 150", aliases: ["supra gtr", "gtr"] },
  { brand: "Honda", name: "Blade 125", aliases: ["blade"] },
  { brand: "Honda", name: "Sonic 150R", aliases: ["sonic"] },
  { brand: "Honda", name: "CB150R StreetFire", aliases: ["cb150r", "cb 150 r", "streetfire"] },
  { brand: "Honda", name: "CB150 Verza", aliases: ["verza"] },
  { brand: "Honda", name: "CBR150R", aliases: ["cbr 150", "cbr150"] },
  { brand: "Honda", name: "CBR250RR", aliases: ["cbr 250", "cbr250"] },
  { brand: "Honda", name: "CRF150L", aliases: ["crf 150", "crf"] },
  { brand: "Honda", name: "Monkey 125", aliases: ["monkey"] },
  { brand: "Honda", name: "Karisma", aliases: ["karisma x"] },
  { brand: "Honda", name: "Mega Pro", aliases: ["megapro"] },
  { brand: "Honda", name: "Tiger Revo", aliases: ["tiger"] },
  // Yamaha
  { brand: "Yamaha", name: "NMAX", aliases: ["n-max", "n max", "nmax 155", "nmax turbo"] },
  { brand: "Yamaha", name: "NMAX Turbo", aliases: ["nmax turbo 155"] },
  { brand: "Yamaha", name: "XMAX", aliases: ["x-max", "x max"] },
  { brand: "Yamaha", name: "Aerox 155", aliases: ["aerox", "aerox connected"] },
  { brand: "Yamaha", name: "Lexi", aliases: ["lexi 125"] },
  { brand: "Yamaha", name: "Fazzio", aliases: ["fazio", "fazzio hybrid"] },
  { brand: "Yamaha", name: "Grand Filano", aliases: ["filano", "grand filano hybrid"] },
  { brand: "Yamaha", name: "Freego", aliases: ["free go", "freego 125"] },
  { brand: "Yamaha", name: "Gear 125", aliases: ["gear", "fino gear"] },
  { brand: "Yamaha", name: "Fino 125", aliases: ["fino"] },
  { brand: "Yamaha", name: "Mio M3", aliases: ["mio", "mio m3 125"] },
  { brand: "Yamaha", name: "Mio Z", aliases: ["mio z 125"] },
  { brand: "Yamaha", name: "Mio S", aliases: ["mio s 125"] },
  { brand: "Yamaha", name: "Mio J", aliases: ["mio j 115"] },
  { brand: "Yamaha", name: "Mio Gear", aliases: ["mio gear 125"] },
  { brand: "Yamaha", name: "Soul GT", aliases: ["soul", "soul gt 125"] },
  { brand: "Yamaha", name: "Xeon", aliases: ["xeon gt", "xeon rc"] },
  { brand: "Yamaha", name: "Jupiter Z1", aliases: ["jupiter z", "jupiter"] },
  { brand: "Yamaha", name: "Jupiter MX", aliases: ["mx", "jupiter mx 135"] },
  { brand: "Yamaha", name: "MX King 150", aliases: ["mx king", "mxking"] },
  { brand: "Yamaha", name: "Vega Force", aliases: ["vega", "vega zr"] },
  { brand: "Yamaha", name: "Force", aliases: ["force 1"] },
  { brand: "Yamaha", name: "Vixion", aliases: ["new vixion", "vixion 150"] },
  { brand: "Yamaha", name: "Vixion R", aliases: ["vixion r 155"] },
  { brand: "Yamaha", name: "Byson", aliases: ["byson fi"] },
  { brand: "Yamaha", name: "WR 155R", aliases: ["wr155", "wr 155"] },
  { brand: "Yamaha", name: "R15", aliases: ["yzf r15", "r 15"] },
  { brand: "Yamaha", name: "R25", aliases: ["yzf r25", "r 25"] },
  { brand: "Yamaha", name: "MT-15", aliases: ["mt15", "mt 15"] },
  { brand: "Yamaha", name: "MT-25", aliases: ["mt25", "mt 25"] },
  { brand: "Yamaha", name: "X-Ride", aliases: ["xride", "x ride"] },
  { brand: "Yamaha", name: "RX King", aliases: ["rx-king", "rxking"] },
  // Kawasaki
  { brand: "Kawasaki", name: "Ninja 250", aliases: ["ninja 250 fi", "ninja250"] },
  { brand: "Kawasaki", name: "Ninja 250 SL", aliases: ["ninja sl"] },
  { brand: "Kawasaki", name: "Ninja ZX-25R", aliases: ["zx25r", "zx-25r", "zx 25r"] },
  { brand: "Kawasaki", name: "Ninja ZX-4RR", aliases: ["zx4rr", "zx-4rr"] },
  { brand: "Kawasaki", name: "Ninja ZX-6R", aliases: ["zx6r", "zx-6r"] },
  { brand: "Kawasaki", name: "Ninja 150 RR", aliases: ["ninja rr", "ninja 150"] },
  { brand: "Kawasaki", name: "Ninja R", aliases: ["ninja rr mono"] },
  { brand: "Kawasaki", name: "Z250", aliases: ["z 250"] },
  { brand: "Kawasaki", name: "Z400", aliases: ["z 400"] },
  { brand: "Kawasaki", name: "Z650", aliases: ["z 650"] },
  { brand: "Kawasaki", name: "Z900", aliases: ["z 900"] },
  { brand: "Kawasaki", name: "ER-6n", aliases: ["er6n"] },
  { brand: "Kawasaki", name: "Versys 250", aliases: ["versys"] },
  { brand: "Kawasaki", name: "Vulcan S", aliases: ["vulcan"] },
  { brand: "Kawasaki", name: "KLX 150", aliases: ["klx150", "klx"] },
  { brand: "Kawasaki", name: "KLX 230", aliases: ["klx230"] },
  { brand: "Kawasaki", name: "D-Tracker 150", aliases: ["dtracker", "d tracker"] },
  { brand: "Kawasaki", name: "W175", aliases: ["w 175"] },
  { brand: "Kawasaki", name: "W175 Cafe", aliases: ["w175 cafe"] },
  { brand: "Kawasaki", name: "Athlete", aliases: ["athlete 125"] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Cari berdasarkan nama atau variasi penulisan (abaikan spasi, tanda hubung, huruf besar/kecil). */
export function searchMotorTypes(brand: string, query: string, limit = 8): MotorType[] {
  const q = norm(query);
  const pool = MOTOR_TYPES.filter((m) => !brand || m.brand === brand);
  if (!q) return pool.slice(0, limit);
  return pool
    .filter((m) => norm(m.name).includes(q) || (m.aliases ?? []).some((a) => norm(a).includes(q)))
    .slice(0, limit);
}
