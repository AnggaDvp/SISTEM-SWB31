"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <span className="brand">SYSTEM NSS SWB31</span>
      <Link href="/input" className={pathname.startsWith("/input") ? "active" : ""}>INPUT DATA</Link>
      <Link href="/table" className={pathname.startsWith("/table") ? "active" : ""}>TABLE DATA</Link>
    </nav>
  );
}
