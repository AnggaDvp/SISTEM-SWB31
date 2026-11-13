"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { displayPhone } from "@/lib/validation";
import { formatJakarta } from "@/lib/format";

type Log = {
  id: number;
  customer_id: number;
  status: string;
  admin: string;
  created_at: string;
  name: string;
  contract_no: string;
  whatsapp: string;
};

export default function RiwayatWaClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/blasts?limit=300", { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? "Gagal memuat riwayat.");
      setLogs((d.logs ?? []) as Log[]);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <h1>RIWAYAT WHATSAPP BLAST</h1>
      <p className="hint" style={{ marginTop: "-.5rem" }}>
        Catatan waktu WhatsApp dibuka & status proses. Waktu dibuka bukan bukti pesan terkirim.
      </p>

      {error && <div className="alert error">{error}</div>}

      <div className="toolbar-actions">
        <span className="count">{logs.length} catatan terakhir</span>
        <button className="btn secondary" onClick={() => void load()} disabled={loading}>MUAT ULANG</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama Konsumen</th>
              <th>Nomor Kontrak</th>
              <th>Nomor WhatsApp</th>
              <th>Waktu Dibuka / Diproses</th>
              <th>Status Proses</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td><Link className="name-link" href={`/table?focus=${l.customer_id}`}>{l.name}</Link></td>
                <td>{l.contract_no}</td>
                <td>{l.whatsapp ? displayPhone(l.whatsapp) : "-"}</td>
                <td>{formatJakarta(l.created_at)}</td>
                <td>{l.status}</td>
                <td>{l.admin || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="empty">Memuat…</div>}
        {!loading && logs.length === 0 && <div className="empty">Belum ada riwayat WhatsApp blast.</div>}
      </div>
    </>
  );
}
