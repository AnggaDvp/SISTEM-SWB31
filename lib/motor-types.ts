// Master tipe motor untuk merek Honda, Yamaha, dan Kawasaki.
// Daftar ini mencakup unit motor matic, bebek, sport, dan big bike yang umum di Indonesia.
// Pengguna tetap bisa mengetik tipe motor secara manual jika tidak ada di daftar.
export type MotorType = { brand: string; name: string; aliases?: string[] };

export const MOTOR_TYPES: MotorType[] = [
  // ============================== HONDA ==============================
  // Matic
  { brand: "Honda", name: "BeAT", aliases: ["beat esp", "bit"] },
  { brand: "Honda", name: "BeAT Street", aliases: ["beat street"] },
  { brand: "Honda", name: "BeAT Deluxe", aliases: ["beat deluxe"] },
  { brand: "Honda", name: "Scoopy", aliases: ["scopy", "skupi"] },
  { brand: "Honda", name: "Genio", aliases: ["genio cbs"] },
  { brand: "Honda", name: "Vario 110", aliases: ["vario"] },
  { brand: "Honda", name: "Vario 125", aliases: ["vario esp", "vario techno 125"] },
  { brand: "Honda", name: "Vario 150", aliases: ["vario 150 esp"] },
  { brand: "Honda", name: "Vario 160", aliases: ["all new vario 160"] },
  { brand: "Honda", name: "PCX 150", aliases: ["pcx 150"] },
  { brand: "Honda", name: "PCX 160", aliases: ["pcx"] },
  { brand: "Honda", name: "ADV 150", aliases: ["adv 150"] },
  { brand: "Honda", name: "ADV 160", aliases: ["adv"] },
  { brand: "Honda", name: "Forza 250", aliases: ["forza"] },
  { brand: "Honda", name: "Stylo 160", aliases: ["stylo"] },
  { brand: "Honda", name: "Spacy", aliases: ["spacy fi"] },
  { brand: "Honda", name: "EM1 e:", aliases: ["em1", "em1e"] },
  { brand: "Honda", name: "ICON e:", aliases: ["icon e", "icone"] },
  // Bebek
  { brand: "Honda", name: "Revo", aliases: ["revo fit", "revo absolute", "absolute revo"] },
  { brand: "Honda", name: "Supra X 125", aliases: ["supra x", "supra"] },
  { brand: "Honda", name: "Supra GTR 150", aliases: ["supra gtr", "gtr"] },
  { brand: "Honda", name: "Blade 125", aliases: ["blade"] },
  { brand: "Honda", name: "Sonic 150R", aliases: ["sonic"] },
  { brand: "Honda", name: "Win 100", aliases: ["win"] },
  { brand: "Honda", name: "Astrea", aliases: ["astrea grand"] },
  { brand: "Honda", name: "Grand", aliases: ["grand"] },
  { brand: "Honda", name: "Legenda", aliases: ["legenda"] },
  { brand: "Honda", name: "Nova", aliases: ["nova"] },
  { brand: "Honda", name: "Karisma", aliases: ["karisma x"] },
  { brand: "Honda", name: "CS1", aliases: ["cs 1"] },
  // Sport & Big Bike
  { brand: "Honda", name: "CB150R StreetFire", aliases: ["cb150r", "cb 150 r", "streetfire"] },
  { brand: "Honda", name: "CB150 Verza", aliases: ["verza"] },
  { brand: "Honda", name: "CBR150R", aliases: ["cbr 150", "cbr150"] },
  { brand: "Honda", name: "CBR250RR", aliases: ["cbr 250", "cbr250"] },
  { brand: "Honda", name: "CB250R", aliases: ["cb 250"] },
  { brand: "Honda", name: "CB500X", aliases: ["cb 500x"] },
  { brand: "Honda", name: "CB650R", aliases: ["cb 650"] },
  { brand: "Honda", name: "CBR650R", aliases: ["cbr 650"] },
  { brand: "Honda", name: "CBR1000RR", aliases: ["cbr 1000"] },
  { brand: "Honda", name: "CRF150L", aliases: ["crf 150", "crf"] },
  { brand: "Honda", name: "CRF250 Rally", aliases: ["crf 250 rally"] },
  { brand: "Honda", name: "CRF1100L Africa Twin", aliases: ["africa twin", "crf 1100"] },
  { brand: "Honda", name: "Monkey 125", aliases: ["monkey"] },
  { brand: "Honda", name: "MSX 125 (Grom)", aliases: ["msx 125", "grom", "msx"] },
  { brand: "Honda", name: "Rebel 300", aliases: ["rebel 300"] },
  { brand: "Honda", name: "Rebel 500", aliases: ["rebel"] },
  { brand: "Honda", name: "Mega Pro", aliases: ["megapro"] },
  { brand: "Honda", name: "Tiger Revo", aliases: ["tiger"] },
  { brand: "Honda", name: "GL Pro", aliases: ["glpro"] },
  { brand: "Honda", name: "GL Max", aliases: ["glmax"] },

  // ============================== YAMAHA ==============================
  // Matic
  { brand: "Yamaha", name: "NMAX", aliases: ["n-max", "n max", "nmax 155"] },
  { brand: "Yamaha", name: "NMAX Turbo", aliases: ["nmax turbo 155"] },
  { brand: "Yamaha", name: "NMAX Neo", aliases: ["nmax neo"] },
  { brand: "Yamaha", name: "XMAX", aliases: ["x-max", "x max"] },
  { brand: "Yamaha", name: "TMAX", aliases: ["t-max", "t max"] },
  { brand: "Yamaha", name: "Aerox 155", aliases: ["aerox", "aerox connected"] },
  { brand: "Yamaha", name: "Aerox Alpha", aliases: ["aerox alpha"] },
  { brand: "Yamaha", name: "Lexi", aliases: ["lexi 125"] },
  { brand: "Yamaha", name: "Lexi LX 155", aliases: ["lexi lx"] },
  { brand: "Yamaha", name: "Fazzio", aliases: ["fazio", "fazzio hybrid"] },
  { brand: "Yamaha", name: "Grand Filano", aliases: ["filano", "grand filano hybrid"] },
  { brand: "Yamaha", name: "Freego", aliases: ["free go", "freego 125"] },
  { brand: "Yamaha", name: "Gear 125", aliases: ["gear"] },
  { brand: "Yamaha", name: "Gear Ultima", aliases: ["gear ultima"] },
  { brand: "Yamaha", name: "Fino 125", aliases: ["fino"] },
  { brand: "Yamaha", name: "Mio M3", aliases: ["mio", "mio m3 125"] },
  { brand: "Yamaha", name: "Mio Z", aliases: ["mio z 125"] },
  { brand: "Yamaha", name: "Mio S", aliases: ["mio s 125"] },
  { brand: "Yamaha", name: "Mio J", aliases: ["mio j 115"] },
  { brand: "Yamaha", name: "Mio Gear", aliases: ["mio gear 125"] },
  { brand: "Yamaha", name: "Mio Fino", aliases: ["mio fino"] },
  { brand: "Yamaha", name: "Soul GT", aliases: ["soul", "soul gt 125"] },
  { brand: "Yamaha", name: "Xeon", aliases: ["xeon gt"] },
  { brand: "Yamaha", name: "Xeon RC", aliases: ["xeon rc"] },
  { brand: "Yamaha", name: "Eterus", aliases: ["eterus"] },
  // Bebek
  { brand: "Yamaha", name: "Jupiter Z", aliases: ["jupiter z"] },
  { brand: "Yamaha", name: "Jupiter Z1", aliases: ["jupiter"] },
  { brand: "Yamaha", name: "Jupiter MX", aliases: ["mx", "jupiter mx 135"] },
  { brand: "Yamaha", name: "MX King 150", aliases: ["mx king", "mxking"] },
  { brand: "Yamaha", name: "Vega Force", aliases: ["vega"] },
  { brand: "Yamaha", name: "Vega RR", aliases: ["vega rr"] },
  { brand: "Yamaha", name: "Force", aliases: ["force 1"] },
  { brand: "Yamaha", name: "Alfa", aliases: ["alfa"] },
  { brand: "Yamaha", name: "Crypton", aliases: ["crypton"] },
  // Sport & Big Bike
  { brand: "Yamaha", name: "Vixion", aliases: ["new vixion", "vixion 150"] },
  { brand: "Yamaha", name: "Vixion R", aliases: ["vixion r 155"] },
  { brand: "Yamaha", name: "Byson", aliases: ["byson fi"] },
  { brand: "Yamaha", name: "Scorpio Z", aliases: ["scorpio"] },
  { brand: "Yamaha", name: "FZ150i", aliases: ["fz 150"] },
  { brand: "Yamaha", name: "X-Ride", aliases: ["xride", "x ride"] },
  { brand: "Yamaha", name: "WR 155R", aliases: ["wr155", "wr 155"] },
  { brand: "Yamaha", name: "XSR 155", aliases: ["xsr155"] },
  { brand: "Yamaha", name: "XSR 700", aliases: ["xsr700"] },
  { brand: "Yamaha", name: "R15", aliases: ["yzf r15", "r 15"] },
  { brand: "Yamaha", name: "R25", aliases: ["yzf r25", "r 25"] },
  { brand: "Yamaha", name: "R1", aliases: ["yzf r1", "r 1"] },
  { brand: "Yamaha", name: "R6", aliases: ["yzf r6", "r 6"] },
  { brand: "Yamaha", name: "MT-15", aliases: ["mt15", "mt 15"] },
  { brand: "Yamaha", name: "MT-25", aliases: ["mt25", "mt 25"] },
  { brand: "Yamaha", name: "MT-07", aliases: ["mt07"] },
  { brand: "Yamaha", name: "MT-09", aliases: ["mt09"] },
  { brand: "Yamaha", name: "Ténéré 700", aliases: ["tenere", "tenere 700"] },
  { brand: "Yamaha", name: "RX King", aliases: ["rx-king", "rxking"] },

  // ============================== KAWASAKI ==============================
  // Bebek & Matic
  { brand: "Kawasaki", name: "Athlete", aliases: ["athlete 125"] },
  { brand: "Kawasaki", name: "Blitz R", aliases: ["blitz"] },
  { brand: "Kawasaki", name: "Kaze ZX130", aliases: ["kaze", "zx130"] },
  { brand: "Kawasaki", name: "KSR 110", aliases: ["ksr"] },
  // Sport & Big Bike
  { brand: "Kawasaki", name: "Ninja 150 R", aliases: ["ninja r", "ninja 150"] },
  { brand: "Kawasaki", name: "Ninja 150 RR", aliases: ["ninja rr"] },
  { brand: "Kawasaki", name: "Ninja 250", aliases: ["ninja 250 fi", "ninja250"] },
  { brand: "Kawasaki", name: "Ninja 250 SL", aliases: ["ninja sl"] },
  { brand: "Kawasaki", name: "Ninja 300", aliases: ["ninja 300"] },
  { brand: "Kawasaki", name: "Ninja 400", aliases: ["ninja 400"] },
  { brand: "Kawasaki", name: "Ninja 650", aliases: ["ninja 650"] },
  { brand: "Kawasaki", name: "Ninja 1000", aliases: ["ninja 1000"] },
  { brand: "Kawasaki", name: "Ninja ZX-25R", aliases: ["zx25r", "zx-25r", "zx 25r"] },
  { brand: "Kawasaki", name: "Ninja ZX-4RR", aliases: ["zx4rr", "zx-4rr"] },
  { brand: "Kawasaki", name: "Ninja ZX-6R", aliases: ["zx6r", "zx-6r"] },
  { brand: "Kawasaki", name: "Ninja ZX-10R", aliases: ["zx10r", "zx-10r"] },
  { brand: "Kawasaki", name: "Ninja H2", aliases: ["h2"] },
  { brand: "Kawasaki", name: "Z125 Pro", aliases: ["z125"] },
  { brand: "Kawasaki", name: "Z250", aliases: ["z 250"] },
  { brand: "Kawasaki", name: "Z400", aliases: ["z 400"] },
  { brand: "Kawasaki", name: "Z650", aliases: ["z 650"] },
  { brand: "Kawasaki", name: "Z900", aliases: ["z 900"] },
  { brand: "Kawasaki", name: "Z1000", aliases: ["z 1000"] },
  { brand: "Kawasaki", name: "ER-6n", aliases: ["er6n"] },
  // Trail & Adventure
  { brand: "Kawasaki", name: "KLX 150", aliases: ["klx150", "klx"] },
  { brand: "Kawasaki", name: "KLX 230", aliases: ["klx230"] },
  { brand: "Kawasaki", name: "KLX 250", aliases: ["klx250"] },
  { brand: "Kawasaki", name: "D-Tracker 150", aliases: ["dtracker", "d tracker"] },
  { brand: "Kawasaki", name: "D-Tracker 250", aliases: ["d tracker 250"] },
  { brand: "Kawasaki", name: "Versys 250", aliases: ["versys"] },
  { brand: "Kawasaki", name: "Versys 650", aliases: ["versys 650"] },
  { brand: "Kawasaki", name: "Versys 1000", aliases: ["versys 1000"] },
  // Cruiser & Retro
  { brand: "Kawasaki", name: "Vulcan S", aliases: ["vulcan"] },
  { brand: "Kawasaki", name: "W175", aliases: ["w 175"] },
  { brand: "Kawasaki", name: "W175 Cafe", aliases: ["w175 cafe"] },
  { brand: "Kawasaki", name: "W175 SE", aliases: ["w175 se"] },
  { brand: "Kawasaki", name: "W250", aliases: ["w 250"] },
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
