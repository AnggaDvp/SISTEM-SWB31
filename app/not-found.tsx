import Link from "next/link";

// Halaman 404 kustom: tampil ketika alamat/URL yang dibuka tidak dikenali.
export default function NotFound() {
  return (
    <main className="container" style={{ textAlign: "center", paddingTop: "12vh" }}>
      <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--red)" }}>404</div>
      <h1 style={{ marginTop: 0 }}>HALAMAN TIDAK DITEMUKAN</h1>
      <p className="hint">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
      <div style={{ marginTop: "1.5rem" }}>
        <Link className="btn" href="/">KEMBALI KE DASHBOARD</Link>
      </div>
    </main>
  );
}
