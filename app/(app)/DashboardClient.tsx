"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STATUSES, type Customer } from "@/lib/types";
import { displayPhone } from "@/lib/validation";

type Stats = {
  total: number;
  wa_valid: number;
  avg_remaining: number | null;
  near_maturity: number;
  near_maturity_threshold: number;
  status_distribution: Record<string, number>;
  brand_distribution: { brand: string; n: number }[];
  follow_up: {
    done: number;
    not_followable: number;
    ro_total: number;
    ro_done: number;
    blast_total: number;
    blast_done: number;
    blast_failed: number;
  };
  blasts: { today: number; last_7_days: number; this_month: number; daily_limit: number };
};

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [nearRows, setNearRows] = useState<Customer[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          fetch("/api/stats", { cache: "no-store" }),
          fetch("/api/customers?sort=oldest", { cache: "no-store" }),
        ]);
        const s = (await sRes.json()) as Stats;
        const c = (await cRes.json()) as { customers: Customer[] };
        if (!alive) return;
        setStats(s);
        const near = c.customers
          .filter((x) => x.remaining !== null && x.remaining <= s.near_maturity_threshold)
          .sort((a, b) => (a.remaining as number) - (b.remaining as number));
        setNearRows(near);
      } catch {
        setError("Tidak dapat memuat statistik.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!stats) return <p className="hint">Memuat statistik…</p>;

  const blastPct = Math.min(100, Math.round((stats.blasts.today / stats.blasts.daily_limit) * 100));

  return (
    <div>
      <h1>DASHBOARD</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Konsumen</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">WA Valid</div>
          <div className="stat-value">{stats.wa_valid}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rata-rata Sisa Angsuran</div>
          <div className="stat-value">{stats.avg_remaining ?? "-"}</div>
        </div>
        <div className="stat-card stat-danger">
          <div className="stat-label">Sisa ≤ {stats.near_maturity_threshold} Bulan</div>
          <div className="stat-value">{stats.near_maturity}</div>
        </div>
      </div>

      <h2 style={{ marginTop: ".5rem" }}>Data Sudah Difollow Up</h2>
      <div className="stat-grid">
        <div className="stat-card stat-ok">
          <div className="stat-label">Sudah Difollow Up</div>
          <div className="stat-value">{stats.follow_up.done}</div>
          <div className="stat-foot">Status proses &quot;Selesai Dikonfirmasi&quot;</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">DATA RO (Input Manual)</div>
          <div className="stat-value">{stats.follow_up.ro_done}</div>
          <div className="stat-foot">dari {stats.follow_up.ro_total} data RO</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">DATA BLAST (Excel)</div>
          <div className="stat-value">{stats.follow_up.blast_done}</div>
          <div className="stat-foot">dari {stats.follow_up.blast_total} data blast</div>
        </div>
        <div className="stat-card stat-danger">
          <div className="stat-label">Tidak Bisa Difollow Up</div>
          <div className="stat-value">{stats.follow_up.not_followable}</div>
          <div className="stat-foot">nomor WA tidak ada / tidak valid</div>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="card">
          <h2>Statistik Blast WhatsApp</h2>
          <div className="blast-bar">
            <div className="blast-bar-fill" style={{ width: `${blastPct}%` }} />
          </div>
          <p className="hint" style={{ marginTop: ".5rem" }}>
            Hari ini: <strong>{stats.blasts.today}</strong> / {stats.blasts.daily_limit} blast
          </p>
          <div className="blast-stats">
            <div><strong>{stats.blasts.last_7_days}</strong><br /><span className="hint">7 hari terakhir</span></div>
            <div><strong>{stats.blasts.this_month}</strong><br /><span className="hint">Bulan ini</span></div>
          </div>
        </div>

        <div className="card">
          <h2>Sebaran Status Komunikasi</h2>
          {STATUSES.map((s) => {
            const n = stats.status_distribution[s] ?? 0;
            const pct = stats.total ? Math.round((n / stats.total) * 100) : 0;
            return (
              <div key={s} className="dist-row">
                <span className="dist-label">{s}</span>
                <div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${pct}%` }} /></div>
                <span className="dist-num">{n}</span>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h2>Sebaran Merek Motor</h2>
          {stats.brand_distribution.length === 0 ? (
            <p className="hint">Belum ada data.</p>
          ) : (
            stats.brand_distribution.map((b) => {
              const pct = stats.total ? Math.round((b.n / stats.total) * 100) : 0;
              return (
                <div key={b.brand} className="dist-row">
                  <span className="dist-label">{b.brand || "Lainnya"}</span>
                  <div className="dist-bar"><div className="dist-bar-fill brand" style={{ width: `${pct}%` }} /></div>
                  <span className="dist-num">{b.n}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".5rem" }}>
          <h2 style={{ margin: 0 }}>Konsumen Sisa Angsuran ≤ {stats.near_maturity_threshold} Bulan</h2>
          <Link className="btn secondary" href="/status">Lihat semua →</Link>
        </div>
        {nearRows.length === 0 ? (
          <p className="hint" style={{ marginTop: "1rem" }}>Tidak ada konsumen dengan sisa angsuran ≤ {stats.near_maturity_threshold} bulan.</p>
        ) : (
          <div className="table-wrap" style={{ marginTop: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Kontrak</th>
                  <th>Nama</th>
                  <th>WhatsApp</th>
                  <th>Merek</th>
                  <th>Tipe</th>
                  <th className="num">Sisa</th>
                </tr>
              </thead>
              <tbody>
                {nearRows.slice(0, 10).map((c) => (
                  <tr key={c.id} className="row-danger">
                    <td>{c.contract_no}</td>
                    <td><Link className="name-link" href={`/table?focus=${c.id}`}>{c.name}</Link></td>
                    <td>{c.whatsapp ? displayPhone(c.whatsapp) : "-"}</td>
                    <td>{c.brand || "-"}</td>
                    <td>{c.motor_type || "-"}</td>
                    <td className="num">{c.remaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
