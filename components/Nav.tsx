"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Nav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav className="nav">
      <span className="brand">SYSTEM NSS SWB31</span>
      <Link href="/input" className={pathname.startsWith("/input") ? "active" : ""}>INPUT DATA</Link>
      <Link href="/table" className={pathname.startsWith("/table") ? "active" : ""}>TABLE DATA</Link>
      <span className="spacer" />
      <span style={{ fontSize: ".8rem", color: "#cfd9e6" }}>{email}</span>
      <button className="link" onClick={logout}>KELUAR</button>
    </nav>
  );
}
