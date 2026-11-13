"use client";

import { useCallback, useEffect, useState } from "react";
import type { Customer } from "@/lib/types";
import { displayPhone } from "@/lib/validation";
import DetailPanel from "@/components/DetailPanel";
import CustomerForm from "@/components/CustomerForm";
import { DEFAULT_TEMPLATE } from "@/lib/template";

const THRESHOLD = 5;

export default function StatusClient() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customers?sort=oldest", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Gagal memuat data.");
      const list = ((data.customers ?? []) as Customer[])
        .filter((c) => c.remaining !== null && c.remaining <= THRESHOLD)
        .sort((a, b) => (a.remaining as number) - (b.remaining as number));
      setRows(list);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetch("/api/template", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.template === "string") {
          setTemplate(d.template);
          setImage(typeof d.image === "string" ? d.image : null);
          setImageName(typeof d.imageName === "string" ? d.imageName : null);
        }
      })
      .catch(() => undefined);
  }, []);

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
    void load();
  }

  return (
    <>
      <h1>STATUS ANGSURAN HAMPIR LUNAS</h1>
      <p className="hint" style={{ marginTop: "-.5rem", marginBottom: "1rem" }}>
        Konsumen dengan sisa angsuran ≤ {THRESHOLD} bulan, diurutkan dari yang paling sedikit.
      </p>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nomor Kontrak</th>
              <th>Nama Konsumen</th>
              <th>Nomor WhatsApp</th>
              <th>Merek</th>
              <th>Tipe Motor</th>
              <th className="num">Tenor</th>
              <th className="num">Angsuran Berjalan</th>
              <th className="num">Sisa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="row-danger">
                <td>{c.contract_no}</td>
                <td><button className="name-link" onClick={() => setSelected(c)}>{c.name}</button></td>
                <td>{c.whatsapp ? displayPhone(c.whatsapp) : "-"}</td>
                <td>{c.brand || "-"}</td>
                <td>{c.motor_type || "-"}</td>
                <td className="num">{c.tenor ?? "-"}</td>
                <td className="num">{c.installment_running ?? "-"}</td>
                <td className="num">{c.remaining ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="empty">Memuat…</div>}
        {!loading && rows.length === 0 && <div className="empty">Tidak ada konsumen dengan sisa angsuran ≤ {THRESHOLD} bulan.</div>}
      </div>

      {selected && !editing && (
        <DetailPanel
          customer={selected}
          template={template}
          image={image}
          imageName={imageName}
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
                void load();
              }}
            />
          </aside>
        </>
      )}
    </>
  );
}
