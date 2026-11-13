"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { WA_STATUSES, type Customer } from "@/lib/types";
import { displayPhone } from "@/lib/validation";
import { buildMessage, DEFAULT_TEMPLATE } from "@/lib/template";

type WaFilter = "" | "valid" | "invalid";

// Jumlah data yang diproses pada sekali jalan "blast otomatis".
const AUTO_LIMIT = 20;
// Jeda antar nomor: 1–5 menit (60–300 detik), diacak tiap nomor.
const DELAY_MIN_SECONDS = 60;
const DELAY_MAX_SECONDS = 300;

type AutoResult = {
  id: number;
  contract_no: string;
  name: string;
  phone: string;
  followable: boolean;
  status: string;
  reason: string;
};

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

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
  const [source, setSource] = useState("");

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [queue, setQueue] = useState<number[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [override, setOverride] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Mode blast otomatis (antrean berjalan sendiri dengan jeda 1–5 menit).
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoTotal, setAutoTotal] = useState(0);
  const [autoIndex, setAutoIndex] = useState(0);
  const [autoCountdown, setAutoCountdown] = useState(0);
  const [autoDone, setAutoDone] = useState<AutoResult[] | null>(null);
  const autoStopRef = useRef(false);
  const skipRef = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams({ limit: "200" });
      if (q.trim()) sp.set("q", q.trim());
      if (wa) sp.set("wa", wa);
      if (waStatus) sp.set("wa_status", waStatus);
      if (source) sp.set("source", source);
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
  }, [q, wa, waStatus, source]);

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

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const noNumberCount = useMemo(() => filtered.filter((r) => !r.wa_valid).length, [filtered]);

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

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((r) => next.delete(r.id));
      else filtered.forEach((r) => next.add(r.id));
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

  /** Catat semua data pada hasil filter yang tidak punya nomor WA (tidak bisa difollow up). */
  async function recordNoNumber() {
    const targets = filtered.filter((r) => !r.wa_valid);
    if (targets.length === 0) return setNotice("Tidak ada data tanpa nomor WA pada hasil filter.");
    setBusy(true);
    setError("");
    try {
      for (const c of targets) {
        await fetch("/api/blasts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_id: c.id,
            status: "Gagal",
            admin: `${admin || "sistem"} · no wa tidak ada`,
          }),
        });
        setRows((prev) => prev.map((r) => (r.id === c.id ? { ...r, wa_status: "Gagal" } : r)));
      }
      setNotice(`${targets.length} data tanpa nomor WA dicatat sebagai "Gagal" (tidak bisa difollow up).`);
    } catch {
      setError("Gagal mencatat data tanpa nomor.");
    } finally {
      setBusy(false);
    }
  }

  function waitWithSkip(seconds: number) {
    return new Promise<void>((resolve) => {
      let remaining = seconds;
      let finished = false;
      setAutoCountdown(remaining);
      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearInterval(timer);
        skipRef.current = null;
        setAutoCountdown(0);
        resolve();
      };
      const timer = window.setInterval(() => {
        if (autoStopRef.current) return finish();
        remaining -= 1;
        setAutoCountdown(remaining);
        if (remaining <= 0) finish();
      }, 1000);
      skipRef.current = finish;
    });
  }

  async function startAuto() {
    if (autoRunning) return;
    const base = selected.size > 0 ? filtered.filter((r) => selected.has(r.id)) : filtered;
    const targets = base.slice(0, AUTO_LIMIT);
    if (targets.length === 0) return setError("Tidak ada konsumen untuk diproses.");
    autoStopRef.current = false;
    setError("");
    setNotice("");
    setAutoDone(null);
    setAutoRunning(true);
    setAutoTotal(targets.length);

    const collected: AutoResult[] = [];
    for (let i = 0; i < targets.length; i++) {
      if (autoStopRef.current) break;
      const c = targets[i];
      setAutoIndex(i + 1);
      setQueue([c.id]);
      setQueueIndex(0);
      setOverride(null);

      let result: AutoResult;
      if (c.wa_valid) {
        const msg = buildMessage(template, {
          name: c.name,
          contract_no: c.contract_no,
          phone: displayPhone(c.whatsapp),
        });
        const url = `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank", "noopener,noreferrer");
        await logStatus(c.id, "WhatsApp Dibuka", true);
        result = {
          id: c.id,
          contract_no: c.contract_no,
          name: c.name,
          phone: displayPhone(c.whatsapp),
          followable: true,
          status: "WhatsApp Dibuka",
          reason: "Nomor WA tersedia",
        };
      } else {
        await logStatus(c.id, "Gagal", true);
        result = {
          id: c.id,
          contract_no: c.contract_no,
          name: c.name,
          phone: c.raw_phone || "(kosong)",
          followable: false,
          status: "Gagal",
          reason: c.whatsapp ? "Nomor WA tidak valid" : "Nomor WA tidak ada — kirim undangan nomor WA",
        };
      }
      collected.push(result);

      if (i < targets.length - 1 && !autoStopRef.current) {
        const secs = DELAY_MIN_SECONDS + Math.floor(Math.random() * (DELAY_MAX_SECONDS - DELAY_MIN_SECONDS + 1));
        await waitWithSkip(secs);
      }
    }

    setAutoRunning(false);
    setAutoIndex(0);
    setAutoTotal(0);
    setAutoCountdown(0);
    setAutoDone(collected);
    const ok = collected.filter((r) => r.followable).length;
    setNotice(
      `${autoStopRef.current ? "Blast otomatis dihentikan" : "Blast otomatis selesai"}: ${ok} bisa difollow up, ${
        collected.length - ok
      } tidak bisa difollow up.`,
    );
  }

  function stopAuto() {
    autoStopRef.current = true;
    skipRef.current?.();
  }

  function skipWait() {
    skipRef.current?.();
  }

  function downloadResults(list: AutoResult[], filename: string) {
    const header = ["Kontrak", "Nama", "Nomor", "Bisa Difollow Up", "Status", "Keterangan"];
    const body = list.map((r) => [
      r.contract_no,
      r.name,
      r.phone,
      r.followable ? "Ya" : "Tidak",
      r.status,
      r.reason,
    ]);
    const csv = [header, ...body].map((cols) => cols.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const doneFollowable = autoDone?.filter((r) => r.followable) ?? [];
  const doneNotFollowable = autoDone?.filter((r) => !r.followable) ?? [];

  return (
    <>
      <h1>DATA WHATSAPP BLAST</h1>
      <p className="hint" style={{ marginTop: "-.5rem" }}>
        Pilih konsumen, buka WhatsApp dengan pesan otomatis, lalu catat status prosesnya. Baris hijau berarti sudah
        selesai dikonfirmasi. Blast otomatis memproses hingga {AUTO_LIMIT} nomor dengan jeda 1–5 menit per nomor, dan
        mencatat hasilnya (bisa / tidak bisa difollow up).
      </p>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {autoRunning && (
        <div className="card" style={{ borderColor: "var(--red)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".5rem" }}>
            <h2 style={{ margin: 0 }}>BLAST OTOMATIS BERJALAN</h2>
            <span className="hint">Nomor {autoIndex} / {autoTotal}</span>
          </div>
          <div className="auto-progress" style={{ marginTop: ".6rem" }}>
            <div
              className="auto-progress-fill"
              style={{ width: `${autoTotal ? Math.round((autoIndex / autoTotal) * 100) : 0}%` }}
            />
          </div>
          <p className="hint" style={{ marginTop: ".5rem" }}>
            {current ? (
              <>
                Sedang diproses: <strong>{current.name}</strong> · {current.contract_no}
              </>
            ) : (
              "Menyiapkan…"
            )}
          </p>
          <p className="hint">
            {autoCountdown > 0
              ? `Menunggu ${autoCountdown} detik sebelum nomor berikutnya (jeda 1–5 menit agar aman dari pemblokiran WhatsApp).`
              : "Memproses nomor…"}
          </p>
          <p className="hint">
            Jika tab WhatsApp tidak terbuka otomatis (diblokir browser), tekan &quot;BUKA WA SEKARANG&quot;.
          </p>
          <div className="actions">
            {current?.wa_valid && (
              <button
                className="btn"
                onClick={() => {
                  const url = `https://wa.me/${current.whatsapp}?text=${encodeURIComponent(message)}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                BUKA WA SEKARANG
              </button>
            )}
            <button className="btn secondary" disabled={autoCountdown <= 0} onClick={skipWait}>
              LEWATI JEDA
            </button>
            <button className="btn danger" onClick={stopAuto}>
              HENTIKAN
            </button>
          </div>
        </div>
      )}

      {autoDone && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".5rem" }}>
            <h2 style={{ margin: 0 }}>RECORD HASIL BLAST</h2>
            <button className="btn secondary" onClick={() => downloadResults(autoDone, "hasil-blast-semua.csv")}>
              EXPORT SEMUA HASIL
            </button>
          </div>

          <div className="stat-grid" style={{ marginTop: ".75rem" }}>
            <div className="stat-card">
              <div className="stat-label">Total Diproses</div>
              <div className="stat-value">{autoDone.length}</div>
            </div>
            <div className="stat-card stat-ok">
              <div className="stat-label">Bisa Difollow Up</div>
              <div className="stat-value">{doneFollowable.length}</div>
            </div>
            <div className="stat-card stat-danger">
              <div className="stat-label">Tidak Bisa Difollow Up</div>
              <div className="stat-value">{doneNotFollowable.length}</div>
            </div>
          </div>

          <div className="section-title">Data yang BISA difollow up (nomor WA ada)</div>
          <div className="toolbar-actions">
            <span className="count">{doneFollowable.length} data</span>
            <button
              className="btn secondary"
              disabled={doneFollowable.length === 0}
              onClick={() => downloadResults(doneFollowable, "bisa-difollow-up.csv")}
            >
              EXPORT BISA DIFOLLOW UP
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kontrak</th>
                  <th>Nama</th>
                  <th>Nomor WA</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {doneFollowable.map((r) => (
                  <tr key={r.id} className="row-ok">
                    <td>{r.contract_no}</td>
                    <td>{r.name}</td>
                    <td>{r.phone}</td>
                    <td>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {doneFollowable.length === 0 && <div className="empty">Tidak ada data.</div>}
          </div>

          <div className="section-title">Data yang TIDAK bisa difollow up (nomor WA tidak ada / tidak valid)</div>
          <div className="toolbar-actions">
            <span className="count">{doneNotFollowable.length} data</span>
            <button
              className="btn secondary"
              disabled={doneNotFollowable.length === 0}
              onClick={() => downloadResults(doneNotFollowable, "tidak-bisa-difollow-up.csv")}
            >
              EXPORT TIDAK BISA DIFOLLOW UP
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kontrak</th>
                  <th>Nama</th>
                  <th>Nomor HP</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {doneNotFollowable.map((r) => (
                  <tr key={r.id} className="row-danger">
                    <td>{r.contract_no}</td>
                    <td>{r.name}</td>
                    <td>{r.phone}</td>
                    <td>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {doneNotFollowable.length === 0 && <div className="empty">Tidak ada data.</div>}
          </div>
        </div>
      )}

      {current && !autoRunning && (
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
                <tr><td>Sumber Data</td><td>{current.batch_id ? "DATA BLAST (Excel)" : "DATA RO (input manual)"}</td></tr>
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
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter sumber data">
          <option value="">Semua Sumber Data</option>
          <option value="ro">DATA RO (input manual)</option>
          <option value="blast">DATA BLAST (Excel)</option>
        </select>
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
        <button className="btn secondary" onClick={toggleAll} disabled={filtered.length === 0}>
          {allSelected ? "BATAL PILIH SEMUA" : "PILIH SEMUA"}
        </button>
        <button className="btn secondary" disabled={selected.size === 0} onClick={() => setSelected(new Set())}>
          KOSONGKAN PILIHAN
        </button>
        <button className="btn secondary" disabled={selected.size === 0} onClick={() => startQueue(Array.from(selected))}>
          BLAST TERPILIH ({selected.size})
        </button>
        <button className="btn secondary" disabled={filtered.length === 0} onClick={() => startQueue(filtered.map((r) => r.id))}>
          PROSES SEMUA HASIL FILTER
        </button>
        <button
          className="btn"
          disabled={filtered.length === 0 || autoRunning}
          onClick={() => void startAuto()}
        >
          BLAST OTOMATIS {AUTO_LIMIT} DATA (JEDA 1–5 MENIT)
        </button>
        <button className="btn secondary" disabled={noNumberCount === 0 || busy || autoRunning} onClick={() => void recordNoNumber()}>
          RECORD DATA TANPA NOMOR ({noNumberCount})
        </button>
        <Link className="btn secondary" href="/table">KEMBALI KE DATA</Link>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Pilih semua" />
              </th>
              <th>Nomor Kontrak</th>
              <th>Nama Konsumen</th>
              <th>Nomor WhatsApp</th>
              <th>Sumber</th>
              <th>KET FU</th>
              <th>Status Proses</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
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
                <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Pilih ${c.name}`} /></td>
                <td>{c.contract_no}</td>
                <td><button className="name-link" onClick={() => { setQueue([c.id]); setQueueIndex(0); setOverride(null); }}>{c.name}</button></td>
                <td>{c.whatsapp ? displayPhone(c.whatsapp) : "-"}</td>
                <td>{c.batch_id ? "BLAST" : "RO"}</td>
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
