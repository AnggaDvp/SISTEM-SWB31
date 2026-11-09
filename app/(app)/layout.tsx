import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

// Semua halaman di grup ini wajib login (dicek di server sebelum halaman dikirim).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <>
      <Nav email={session.sub} />
      <main className="container">{children}</main>
    </>
  );
}
