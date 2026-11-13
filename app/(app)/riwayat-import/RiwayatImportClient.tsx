"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Customer } from "@/lib/types";
import { displayPhone } from "@/lib/validation";
import { formatJakarta } from "@/lib/format";

type Batch = {
  id: number;
  filename: string;
  sheet: string;
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  processed: number;
  unprocessed: number;
  uploaded_at: string;
};

export default function RiwayatImportClient() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ batch: Batch; customers: Customer[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/import/batches", { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? "Gagal memuat riwayat.");
      setBatches((d.batches ?? []) as Batch[]);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(id: number) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/import/batches/${id}`, { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setDetail({ batch: d.batch as Batch, customers: (d.customers ?? []) as Customer[] });
    } catch {
      setError("Gagal memuat detail batch.");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <>
      <h1>RIWAYAT IMPORT EXCEL</h1>
      <p className="hint" style={{ marginTop: "-.5rem" }}>Setiap proses import dicatat sebagai satu batch.</p>

      {error && <div className="alert error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Batch</th>
              <th>Nama File</th>
              <th>Sheet</th>
              <th className="num">Total</th>
              <th className="num">Valid</th>
              <th className="num">Tidak Valid</th>
              <th className="num">Duplikat</th>
              <th className="num">Diproses</th>
              <th>Waktu Upload</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td>#{b.id}</td>
                <td>{b.filename}</td>
                <td>{b.sheet || "-"}</td>
                <td className="num">{b.total}</td>
                <td className="num">{b.valid}</td>
                <td className="num">{b.invalid}</td>
                <td className="num">{b.duplicate}</td>
                <td className="num">{b.processed} / {b.total}</td>
                <td>{formatJakarta(b.uploaded_at)}</td>
                <td>
                  <button className="btn secondary" onClick={() => void toggle(b.id)}>
                    {openId === b.id ? "TUTUP" : "DETAIL"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="empty">Memuat…</div>}
        {!loading && batches.length === 0 && <div className="empty">Belum ada riwayat import.</div>}
      </div>

      {openId !== null && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h2>Data Batch #{openId}</h2>
          {detailLoading && <p className="hint">Memuat data…</p>}
          {detail && detail.customers.length === 0 && <p className="hint">Tidak ada data pada batch ini.</p>}
          {detail && detail.customers.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nomor Kontrak</th>
                    <th>Nama Konsumen</th>
                    <th>Nomor WhatsApp</th>
                    <th>KET FU</th>
                    <th>Status Proses</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.customers.map((c) => (
                    <tr key={c.id}>
                      <td>{c.contract_no}</td>
                      <td><Link className="name-link" href={`/table?focus=${c.id}`}>{c.name}</Link></td>
                      <td>{c.whatsapp ? displayPhone(c.whatsapp) : "-"}</td>
                      <td>{c.ket_fu || "-"}</td>
                      <td>{c.wa_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
