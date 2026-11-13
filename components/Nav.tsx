"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

const MENU = [
  { href: "/", label: "DASHBOARD" },
  { href: "/input", label: "INPUT MANUAL" },
  { href: "/import", label: "IMPORT EXCEL" },
  { href: "/blast", label: "DATA WHATSAPP BLAST" },
  { href: "/table", label: "DATA KONSUMEN" },
  { href: "/template", label: "TEMPLATE PESAN" },
  { href: "/promo", label: "MATERI PROMOSI" },
  { href: "/riwayat-import", label: "RIWAYAT IMPORT" },
  { href: "/riwayat-wa", label: "RIWAYAT WHATSAPP" },
  { href: "/status", label: "STATUS ANGSURAN" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" className="brand" aria-label="SWB31 home">
        <Logo size="sm" variant="light" />
      </Link>
      <div className="nav-links">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={pathname === m.href || (m.href !== "/" && pathname.startsWith(m.href)) ? "active" : ""}
          >
            {m.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
