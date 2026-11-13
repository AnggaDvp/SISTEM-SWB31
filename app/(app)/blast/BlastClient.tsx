"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WA_STATUSES, type Customer } from "@/lib/types";
import { displayPhone } from "@/lib/validation";
import { buildMessage, DEFAULT_TEMPLATE } from "@/lib/template";

type WaFilter = "" | "valid" | "invalid";

export default function BlastClient() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [poster, setPoster] = useState<string | null>(null);
  const [admin, setAdmin] = useState("");

  const [q, setQ] = useState("");
  const [wa, setWa] = useState<WaFilter>("");
  const [waStatus, setWaStatus] = useState("");
  const [ket, setKet] = useState("");

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [queue, setQueue] = useState<number[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [override, setOverride] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams({ limit: "200" });
      if (q.trim()) sp.set("q", q.trim());
      if (wa) sp.set("wa", wa);
      if (waStatus) sp.set("wa_status", waStatus);
      const res = await fetch(`/api/customers?${sp.toString()}`, { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? "Gagal memuat data.");
      setRows((d.customers ?? []) as Customer[]);
      setSelected(new Set());
      setQueue([]);
      setQueueIndex(0);
      setOverride(null);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [q, wa, waStatus]);

  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => {
    fetch("/api/template", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.template === "string") setTemplate(d.template);
        setPoster(typeof d.image === "string" ? d.image : null);
      })
      .catch(() => undefined);
  }, []);

  const ketOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const k = (r.ket_fu ?? "").trim();
      if (k) set.add(k);
    });
    return Array.from(set).slice(0, 50);
  }, [rows]);

  const filtered = useMemo(() => {
    if (!ket) return rows;
    return rows.filter((r) => (r.ket_fu ?? "").trim() === ket);
  }, [rows, ket]);

  const currentId = queue.length > 0 ? queue[queueIndex] : null;
  const current = currentId !== null ? rows.find((r) => r.id === currentId) ?? null : null;

  const baseMessage = current
    ? buildMessage(template, { name: current.name, contract_no: current.contract_no, phone: displayPhone(current.whatsapp) })
    : "";
  const message = override ?? baseMessage;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startQueue(ids: number[]) {
    const order = filtered.filter((r) => ids.includes(r.id)).map((r) => r.id);
    if (order.length === 0) return setError("Pilih minimal satu konsumen.");
    setError("");
    setQueue(order);
    setQueueIndex(0);
    setOverride(null);
  }

  function advance() {
    setOverride(null);
    setQueueIndex((i) => (queue.length === 0 ? 0 : Math.min(i + 1, queue.length - 1)));
  }

  async function logStatus(customerId: number, status: string, silent = false) {
    try {
      await fetch("/api/blasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId, status, admin }),
      });
      setRows((prev) => prev.map((r) => (r.id === customerId ? { ...r, wa_status: status } : r)));
      if (!silent) setNotice(`Status ${status} dicatat.`);
    } catch {
      setError("Gagal mencatat status ke server.");
    }
  }

  async function openChat(c: Customer) {
    if (!c.wa_valid || busy) return;
    setBusy(true);
    try {
      await logStatus(c.id, "WhatsApp Dibuka", true);
      const url = `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      setNotice("WhatsApp dibuka. Tekan Kirim di WhatsApp, lalu tandai status di sini.");
    } finally {
      setBusy(false);
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setNotice("Pesan disalin.");
    } catch {
      setError("Gagal menyalin pesan.");
    }
  }

  async function mark(c: Customer, status: string) {
    await logStatus(c.id, status);
    advance();
  }

  return (
    <>
      <h1>DATA WHATSAPP BLAST</h1>
      <p className="hint" style={{ marginTop: "-.5rem" }}>
        Pilih konsumen, buka WhatsApp dengan pesan otomatis, lalu catat status prosesnya. Membuka WhatsApp tidak
        berarti pesan sudah terkirim.
      </p>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {current && (
        <div className="card" style={{ borderColor: "var(--red)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".5rem" }}>
            <h2 style={{ margin: 0 }}>
              {current.name} <span className="hint">· {current.contract_no}</span>
            </h2>
            <span className="hint">
              {queue.length > 0 ? `Antrean ${queueIndex + 1} / ${queue.length}` : "Pratinjau"}
            </span>
          </div>

          <div className="table-wrap" style={{ marginTop: ".75rem" }}>
            <table className="detail-table">
              <tbody>
                <tr><td>Nomor Kontrak</td><td>{current.contract_no}</td></tr>
                <tr><td>Nomor HP Asli</td><td>{current.raw_phone || "-"}</td></tr>
                <tr><td>Nomor WhatsApp</td><td>{current.whatsapp ? displayPhone(current.whatsapp) : "-"}{current.wa_valid ? "" : " (perlu diperiksa)"}</td></tr>
                <tr><td>KET FU</td><td>{current.ket_fu || "-"}</td></tr>
                <tr><td>Status Proses</td><td>{current.wa_status}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="field" style={{ marginTop: ".75rem" }}>
            <label>Pesan WhatsApp (bisa diedit sebelum dibuka)</label>
            <textarea value={message} rows={10} onChange={(e) => setOverride(e.target.value)} />
          </div>

          <div className="actions">
            <button className="btn" disabled={!current.wa_valid || busy} onClick={() => void openChat(current)}>
              CHAT WHATSAPP
            </button>
            <button className="btn secondary" onClick={() => void copyMessage()}>SALIN PESAN</button>
            <button className="btn secondary" onClick={() => setOverride(null)}>RESET KE TEMPLATE</button>
          </div>

          <div className="actions">
            <button className="btn" disabled={busy} onClick={() => void mark(current, "Selesai Dikonfirmasi")}>TANDAI SELESAI</button>
            <button className="btn secondary" disabled={busy} onClick={() => void mark(current, "Dilewati")}>LEWATI KONSUMEN</button>
            <button className="btn secondary" disabled={busy} onClick={() => void mark(current, "Gagal")}>TANDAI GAGAL</button>
            {queue.length > 0 && (
              <button className="btn secondary" disabled={busy} onClick={() => { setOverride(null); setQueue([]); }}>KEMBALI KE DATA</button>
            )}
          </div>

          {poster && (
            <div style={{ marginTop: ".75rem" }}>
              <div className="hint" style={{ marginBottom: ".4rem" }}>
                Poster promo — lampirkan manual di WhatsApp (klik &quot;SALIN PESAN&quot; lalu tempel teks, lampirkan gambar ini).
              </div>
              <img src={poster} alt="Poster promo" style={{ maxWidth: "100%", maxHeight: 220, border: "1px solid #ddd", borderRadius: 8 }} />
            </div>
          )}
        </div>
      )}

      <div className="toolbar" style={{ marginTop: "1rem" }}>
        <input placeholder="Cari nama, faktur, WhatsApp…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={ket} onChange={(e) => setKet(e.target.value)}>
          <option value="">Semua KET FU</option>
          {ketOptions.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={wa} onChange={(e) => setWa(e.target.value as WaFilter)}>
          <option value="">Semua Nomor WA</option>
          <option value="valid">WA Valid</option>
          <option value="invalid">Perlu Diperiksa</option>
        </select>
        <select value={waStatus} onChange={(e) => setWaStatus(e.target.value)}>
          <option value="">Semua Status Proses</option>
          {WA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input placeholder="Nama admin (opsional)" value={admin} onChange={(e) => setAdmin(e.target.value)} style={{ maxWidth: 200 }} />
      </div>

      <div className="toolbar-actions">
        <span className="count">{filtered.length} konsumen · {selected.size} dipilih</span>
        <button className="btn secondary" disabled={selected.size === 0} onClick={() => startQueue(Array.from(selected))}>
          BLAST TERPILIH ({selected.size})
        </button>
        <button className="btn secondary" disabled={filtered.length === 0} onClick={() => startQueue(filtered.map((r) => r.id))}>
          PROSES SEMUA HASIL FILTER
        </button>
        <Link className="btn secondary" href="/table">KEMBALI KE DATA</Link>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Nomor Kontrak</th>
              <th>Nama Konsumen</th>
              <th>Nomor WhatsApp</th>
              <th>KET FU</th>
              <th>Status Proses</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className={!c.wa_valid && c.whatsapp ? "row-danger" : undefined}>
                <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Pilih ${c.name}`} /></td>
                <td>{c.contract_no}</td>
                <td><button className="name-link" onClick={() => { setQueue([c.id]); setQueueIndex(0); setOverride(null); }}>{c.name}</button></td>
                <td>{c.whatsapp ? displayPhone(c.whatsapp) : "-"}</td>
                <td>{c.ket_fu || "-"}</td>
                <td>{c.wa_status}</td>
                <td>
                  <button className="btn secondary" disabled={!c.wa_valid} onClick={() => { setQueue([c.id]); setQueueIndex(0); setOverride(null); }}>
                    PROSES
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="empty">Memuat…</div>}
        {!loading && filtered.length === 0 && <div className="empty">Tidak ada konsumen yang cocok.</div>}
      </div>

      {rows.length >= 200 && (
        <p className="hint">Menampilkan maksimal 200 konsumen. Persempit dengan pencarian/filter untuk melihat sisanya.</p>
      )}
    </>
  );
}
