"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BRANDS, MAX_TENOR, STATUSES, WA_STATUSES, type Customer } from "@/lib/types";
import { displayPhone } from "@/lib/validation";
import CustomerForm from "@/components/CustomerForm";
import DetailPanel from "@/components/DetailPanel";
import { DEFAULT_TEMPLATE } from "@/lib/template";

type Filters = {
  q: string;
  brand: string;
  tenor: string;
  status: string;
  wa: string;
  wa_status: string;
  source: string;
  sort: string;
};

// Jumlah baris yang dimuat per permintaan (paginasi "muat lebih banyak").
const PAGE_SIZE = 50;

export default function TableClient() {
  const [filters, setFilters] = useState<Filters>({
    q: "",
    brand: "",
    tenor: "",
    status: "",
    wa: "",
    wa_status: "",
    source: "",
    sort: "newest",
  });
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [waImage, setWaImage] = useState<string | null>(null);
  const [waImageName, setWaImageName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (f: Filters, offset = 0) => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => v && sp.set(k, v));
      sp.set("limit", String(PAGE_SIZE));
      sp.set("offset", String(offset));
      const res = await fetch(`/api/customers?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Gagal memuat data.");
      const list = (data.customers ?? []) as Customer[];
      setRows((prev) => (offset > 0 ? [...prev, ...list] : list));
      setTotal(Number(data.total ?? list.length));
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat ulang setiap filter berubah (pencarian ditunda sebentar agar tidak membebani server).
  useEffect(() => {
    const t = setTimeout(() => void load(filters, 0), filters.q ? 250 : 0);
    return () => clearTimeout(t);
  }, [filters, load]);

  // Buka detail otomatis bila URL berisi ?focus=<id> (tautan dari Dashboard/Status).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("focus");
    if (!id) return;
    let alive = true;
    fetch(`/api/customers/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (alive && d.customer) setSelected(d.customer as Customer);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    fetch("/api/template", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.template === "string") {
          setTemplate(d.template);
          setWaImage(typeof d.image === "string" ? d.image : null);
          setWaImageName(typeof d.imageName === "string" ? d.imageName : null);
        }
      })
      .catch(() => undefined);
  }, []);

  const setF = (k: keyof Filters, v: string) => setFilters((p) => ({ ...p, [k]: v }));

  async function remove(c: Customer) {
    if (!window.confirm(`Hapus data ${c.name} (kontrak ${c.contract_no})? Tindakan ini tidak bisa dibatalkan.`)) return;
    setNotice("");
    const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => ({})) : {};
      return setError(d.error ?? "Gagal menghapus data.");
    }
    setSelected(null);
    setNotice("Data berhasil dihapus.");
    void load(filters);
  }

  async function restore(file: File) {
    setError("");
    setNotice("");
    try {
      const json = JSON.parse(await file.text());
      if (!window.confirm("Pulihkan dari file backup? Data dengan nomor kontrak sama akan diperbarui; data lain tidak dihapus.")) return;
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? "Gagal memulihkan backup.");
      setNotice(`Backup dipulihkan: ${d.restored} data diproses${d.skipped ? `, ${d.skipped} dilewati karena tidak valid` : ""}.`);
      void load(filters);
    } catch {
      setError("File backup tidak dapat dibaca.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <h1>TABLE DATA</h1>
      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="toolbar">
        <input placeholder="Cari kontrak, nama, WhatsApp, atau plat..." value={filters.q} onChange={(e) => setF("q", e.target.value)} aria-label="Pencarian" />
        <select value={filters.brand} onChange={(e) => setF("brand", e.target.value)} aria-label="Filter merek">
          <option value="">Semua Merek</option>
          {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filters.tenor} onChange={(e) => setF("tenor", e.target.value)} aria-label="Filter tenor">
          <option value="">Semua Tenor</option>
          {Array.from({ length: MAX_TENOR }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} Bulan</option>)}
        </select>
        <select value={filters.source} onChange={(e) => setF("source", e.target.value)} aria-label="Filter sumber data">
          <option value="">Semua Sumber Data</option>
          <option value="ro">DATA RO (input manual)</option>
          <option value="blast">DATA BLAST (Excel)</option>
        </select>
        <select value={filters.wa} onChange={(e) => setF("wa", e.target.value)} aria-label="Filter status WhatsApp">
          <option value="">Semua Nomor WA</option>
          <option value="valid">WA Valid</option>
          <option value="empty">WA Kosong</option>
          <option value="invalid">WA Tidak Valid</option>
        </select>
        <select value={filters.wa_status} onChange={(e) => setF("wa_status", e.target.value)} aria-label="Filter status proses WA">
          <option value="">Semua Status Proses</option>
          {WA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setF("status", e.target.value)} aria-label="Filter status komunikasi">
          <option value="">Semua Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.sort} onChange={(e) => setF("sort", e.target.value)} aria-label="Urutkan">
          <option value="newest">Terbaru diinput</option>
          <option value="oldest">Terlama diinput</option>
          <option value="name_asc">Nama A–Z</option>
          <option value="name_desc">Nama Z–A</option>
          <option value="remaining_asc">Sisa angsuran terkecil</option>
          <option value="remaining_desc">Sisa angsuran terbesar</option>
        </select>
      </div>

      <div className="toolbar-actions">
        <span className="count">{loading && rows.length === 0 ? "Memuat..." : `Menampilkan ${rows.length} dari ${total} konsumen`}</span>
        <a className="btn secondary" href="/api/export" download>EXPORT CSV (EXCEL)</a>
        <a className="btn secondary" href="/api/backup" download>BACKUP DATABASE</a>
        <button className="btn secondary" onClick={() => fileRef.current?.click()}>PULIHKAN BACKUP</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && void restore(e.target.files[0])} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nomor Kontrak</th>
              <th>Nama Konsumen</th>
              <th>Nomor WhatsApp</th>
              <th>Sumber</th>
              <th>Status Proses</th>
              <th>Plat Motor</th>
              <th>Merek</th>
              <th>Tipe Motor</th>
              <th className="num">Tenor</th>
              <th className="num">Angsuran Berjalan</th>
              <th className="num">Sisa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className={
                  c.wa_status === "Selesai Dikonfirmasi"
                    ? "row-ok"
                    : !c.wa_valid && c.whatsapp
                      ? "row-danger"
                      : undefined
                }
              >
                <td>{c.contract_no}</td>
                <td><button className="name-link" onClick={() => setSelected(c)}>{c.name}</button></td>
                <td>{c.whatsapp ? displayPhone(c.whatsapp) : "-"}</td>
                <td>{c.batch_id ? "BLAST" : "RO"}</td>
                <td>{c.wa_status}</td>
                <td>{c.plate || "-"}</td>
                <td>{c.brand || "-"}</td>
                <td>{c.motor_type || "-"}</td>
                <td className="num">{c.tenor ?? "-"}</td>
                <td className="num">{c.installment_running ?? "-"}</td>
                <td className="num">{c.remaining ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <div className="empty">Belum ada data yang cocok.</div>}
      </div>

      <p className="hint">
        <span className="legend-swatch row-ok" /> Sudah difollow up (status proses &quot;Selesai Dikonfirmasi&quot;) ·{" "}
        <span className="legend-swatch row-danger" /> Nomor WA tidak valid.
      </p>

      {rows.length < total && (
        <div style={{ marginTop: ".75rem", textAlign: "center" }}>
          <button className="btn secondary" disabled={loading} onClick={() => void load(filters, rows.length)}>
            {loading ? "MEMUAT..." : `MUAT LEBIH BANYAK (${total - rows.length} lagi)`}
          </button>
        </div>
      )}

      <div style={{ marginTop: "1rem" }}>
        <Link className="btn secondary" href="/template">→ KELOLA TEMPLATE BLAST</Link>
      </div>

      {selected && !editing && (
        <DetailPanel
          customer={selected}
          template={template}
          image={waImage}
          imageName={waImageName}
          onClose={() => setSelected(null)}
          onEdit={() => setEditing(selected)}
          onDelete={() => void remove(selected)}
          onUpdated={(c) => {
            setSelected(c);
            setRows((r) => r.map((x) => (x.id === c.id ? c : x)));
          }}
        />
      )}

      {editing && (
        <>
          <div className="overlay" onClick={() => setEditing(null)} />
          <aside className="drawer" role="dialog" aria-label="Edit data">
            <div className="drawer-head">
              <h2>EDIT DATA</h2>
              <button className="close" onClick={() => setEditing(null)} aria-label="Tutup">×</button>
            </div>
            <CustomerForm
              mode="edit"
              initial={editing}
              onCancel={() => setEditing(null)}
              onSaved={(c) => {
                setEditing(null);
                setSelected(c);
                setNotice("Perubahan berhasil disimpan.");
                void load(filters);
              }}
            />
          </aside>
        </>
      )}
    </>
  );
}
