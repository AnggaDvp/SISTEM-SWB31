"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IMPORT_FIELDS, type ColumnMapping, type ImportRow, type SheetPreview } from "@/lib/import-types";
import { isWhatsappValid, normalizePhone } from "@/lib/validation";

type PreviewResponse = SheetPreview & {
  filename: string;
  size: number;
  duplicateRowNumbers: number[];
};

const PAGE_SIZE = 25;

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function waState(raw: string): "empty" | "valid" | "invalid" {
  const n = normalizePhone(raw);
  if (!n) return "empty";
  return isWhatsappValid(n) ? "valid" : "invalid";
}

/**
 * Status WA pada tabel pemeriksaan Excel:
 * - KET FU "NO"  -> WA TIDAK VALID
 * - KET FU "OK"  -> WA VALID
 * - selain itu   -> mengikuti hasil pembacaan nomor HP
 */
function waStateOfRow(r: { no_hp: string; ket_fu: string }): "empty" | "valid" | "invalid" {
  const k = (r.ket_fu ?? "").trim().toLowerCase();
  if (k === "ok") return "valid";
  if (k === "no") return "invalid";
  return waState(r.no_hp);
}

const EMPTY_MAPPING: ColumnMapping = { no: -1, faktur: -1, nama: -1, no_hp: -1, chat_wa: -1, ket_fu: -1 };

export default function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dupSet, setDupSet] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);

  const [q, setQ] = useState("");
  const [ketFilter, setKetFilter] = useState("");
  const [waFilter, setWaFilter] = useState("");
  const [sort, setSort] = useState("file");
  const [page, setPage] = useState(1);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadPreview = useCallback(
    async (f: File, opts: { sheet?: string; mapping?: Partial<ColumnMapping>; hasHeader?: boolean } = {}) => {
      setLoading(true);
      setError("");
      try {
        const fd = new FormData();
        fd.set("file", f);
        if (opts.sheet) fd.set("sheet", opts.sheet);
        if (opts.mapping) fd.set("mapping", JSON.stringify(opts.mapping));
        if (typeof opts.hasHeader === "boolean") fd.set("hasHeader", String(opts.hasHeader));

        const res = await fetch("/api/import/preview", { method: "POST", body: fd });
        const d = (await res.json().catch(() => ({}))) as Partial<PreviewResponse> & { error?: string };
        if (!res.ok) {
          setError(d.error ?? "Gagal membaca file.");
          setData(null);
          setRows([]);
          return;
        }
        setData(d as PreviewResponse);
        setRows((d.rows ?? []) as ImportRow[]);
        setDupSet(new Set((d.duplicateRowNumbers ?? []) as number[]));
        // Semua baris terpilih secara default agar mudah disimpan.
        setSelected(new Set(((d.rows ?? []) as ImportRow[]).map((r) => r.rowNumber)));
        setPage(1);
      } catch {
        setError("Tidak dapat terhubung ke server.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  async function handleFile(f: File) {
    setNotice("");
    setError("");
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      setError("Format file harus XLSX, XLS, atau CSV.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10 MB.");
      return;
    }
    setFile(f);
    setMappingOpen(false);
    await loadPreview(f);
  }

  function cancelImport() {
    setFile(null);
    setData(null);
    setRows([]);
    setSelected(new Set());
    setDupSet(new Set());
    setError("");
    setNotice("");
    setQ("");
    setKetFilter("");
    setWaFilter("");
    setMappingOpen(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function updateRow(rowNumber: number, patch: Partial<ImportRow>) {
    setRows((prev) => prev.map((r) => (r.rowNumber === rowNumber ? { ...r, ...patch } : r)));
  }

  function deleteRows(rowNumbers: number[]) {
    const del = new Set(rowNumbers);
    setRows((prev) => prev.filter((r) => !del.has(r.rowNumber)));
    setSelected((prev) => {
      const next = new Set(prev);
      del.forEach((n) => next.delete(n));
      return next;
    });
  }

  function clearAllRows() {
    if (rows.length === 0) return;
    if (
      !window.confirm(
        "Hapus SEMUA data pada tabel pemeriksaan ini? Data yang sudah tersimpan di database TIDAK terpengaruh.",
      )
    )
      return;
    setRows([]);
    setSelected(new Set());
    setDupSet(new Set());
    setQ("");
    setKetFilter("");
    setWaFilter("");
    setError("");
    setNotice("Semua baris pemeriksaan dihapus. Database tidak berubah.");
  }

  const stats = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    let kosong = 0;
    let ok = 0;
    let no = 0;
    for (const r of rows) {
      const st = waStateOfRow(r);
      if (st === "valid") valid++;
      else if (st === "invalid") invalid++;
      else kosong++;
      const k = (r.ket_fu ?? "").trim().toLowerCase();
      if (k === "ok") ok++;
      else if (k === "no") no++;
    }
    return { total: rows.length, valid, invalid, kosong, ok, no, duplicate: dupSet.size };
  }, [rows, dupSet]);

  const ketOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const k = (r.ket_fu ?? "").trim();
      if (k) set.add(k);
    });
    return Array.from(set).slice(0, 50);
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (qq && !(r.nama.toLowerCase().includes(qq) || r.faktur.toLowerCase().includes(qq))) return false;
      if (ketFilter && (r.ket_fu ?? "").trim() !== ketFilter) return false;
      if (waFilter) {
        const st = waStateOfRow(r);
        if (waFilter === "valid" && st !== "valid") return false;
        if (waFilter === "invalid" && st === "valid") return false;
      }
      return true;
    });
    if (sort === "nama") list = [...list].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    else if (sort === "faktur") list = [...list].sort((a, b) => a.faktur.localeCompare(b.faktur, "id"));
    return list;
  }, [rows, q, ketFilter, waFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.rowNumber));

  function toggleRow(n: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((r) => next.delete(r.rowNumber));
      else filtered.forEach((r) => next.add(r.rowNumber));
      return next;
    });
  }

  async function save() {
    if (!rows.length) return;
    const toSave = rows.filter((r) => selected.has(r.rowNumber));
    if (toSave.length === 0) return setError("Pilih minimal satu baris untuk disimpan.");
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: data?.filename ?? file?.name ?? "import",
          sheet: data?.sheet ?? "",
          rows: toSave.map((r) => ({ faktur: r.faktur, nama: r.nama, no_hp: r.no_hp, ket_fu: r.ket_fu })),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        error?: string;
        batch_id?: number;
        total?: number;
        inserted?: number;
        invalid?: number;
        duplicate?: number;
      };
      if (!res.ok) return setError(d.error ?? "Gagal menyimpan data.");
      setNotice(
        `Import selesai — Batch #${d.batch_id}: ${d.inserted ?? 0} data tersimpan, ${d.invalid ?? 0} tidak valid, ${d.duplicate ?? 0} duplikat dilewati.`,
      );
      cancelImport();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  function applyMapping(key: keyof ColumnMapping, value: number) {
    if (!file || !data) return;
    const mapping: ColumnMapping = { ...EMPTY_MAPPING, ...data.mapping, [key]: value };
    void loadPreview(file, { sheet: data.sheet, mapping, hasHeader: data.hasHeader });
  }

  return (
    <>
      <h1>IMPORT EXCEL WHATSAPP BLAST</h1>
      <p className="hint" style={{ marginTop: "-.5rem" }}>
        Unggah file XLSX/XLS/CSV. Kolom dibaca otomatis (NO, FAKTUR, NAMA PEMOHON, NO HP, CHAT WA, KET FU). Data
        ditampilkan dulu untuk diperiksa sebelum disimpan ke database. Status WA mengikuti KET FU:{" "}
        <strong>OK = VALID</strong>, <strong>NO = TIDAK VALID</strong>.
      </p>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {/* Zona unggah */}
      <div
        className="card"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        style={{
          borderStyle: "dashed",
          borderColor: dragging ? "var(--red)" : undefined,
          textAlign: "center",
          background: dragging ? "var(--red-soft)" : undefined,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: "1rem", marginBottom: ".5rem" }}>
          Tarik & lepas file di sini, atau
        </div>
        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => inputRef.current?.click()} disabled={loading}>
            PILIH FILE EXCEL
          </button>
          {file && (
            <button className="btn secondary" onClick={cancelImport} disabled={busy || loading}>
              BATALKAN IMPORT
            </button>
          )}
        </div>
        {file && (
          <p className="hint" style={{ marginTop: ".75rem", marginBottom: 0 }}>
            File: <strong>{file.name}</strong> · {fmtSize(file.size)}
            {data ? ` · ${data.sheetNames.length} sheet` : ""}
            {data ? ` · ${data.total} baris data` : ""}
          </p>
        )}
      </div>

      {loading && <p className="hint">Membaca file…</p>}

      {data && rows.length > 0 && (
        <>
          {/* Statistik */}
          <div className="stat-grid" style={{ marginTop: "1rem" }}>
            <div className="stat-card"><div className="stat-label">Total Terbaca</div><div className="stat-value">{stats.total}</div></div>
            <div className="stat-card"><div className="stat-label">WA Valid</div><div className="stat-value">{stats.valid}</div></div>
            <div className="stat-card stat-danger"><div className="stat-label">Perlu Diperiksa</div><div className="stat-value">{stats.invalid + stats.kosong}</div></div>
            <div className="stat-card"><div className="stat-label">Duplikat</div><div className="stat-value">{stats.duplicate}</div></div>
            <div className="stat-card"><div className="stat-label">KET FU = OK</div><div className="stat-value">{stats.ok}</div></div>
            <div className="stat-card"><div className="stat-label">KET FU = NO</div><div className="stat-value">{stats.no}</div></div>
          </div>

          {/* Pengaturan sheet & pemetaan kolom */}
          <div className="card" style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="field" style={{ margin: 0, minWidth: 180 }}>
                <label>Sheet</label>
                <select
                  value={data.sheet}
                  onChange={(e) => file && void loadPreview(file, { sheet: e.target.value, mapping: data.mapping, hasHeader: data.hasHeader })}
                >
                  {data.sheetNames.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <label className="hint" style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={data.hasHeader}
                  onChange={(e) => file && void loadPreview(file, { sheet: data.sheet, mapping: data.mapping, hasHeader: e.target.checked })}
                />
                Baris pertama = judul kolom
              </label>
              <button className="btn secondary" onClick={() => setMappingOpen((v) => !v)}>
                {mappingOpen ? "SEMBUNYIKAN PEMETAAN KOLOM" : "PEMETAAN KOLOM MANUAL"}
              </button>
            </div>

            {mappingOpen && (
              <div style={{ marginTop: "1rem" }}>
                <p className="hint">Pilih kolom file untuk tiap field. Ubah bila hasil deteksi otomatis kurang tepat.</p>
                <div className="row" style={{ flexWrap: "wrap", gap: ".75rem" }}>
                  {IMPORT_FIELDS.map((f) => (
                    <div key={f.key} className="field" style={{ minWidth: 170, margin: 0 }}>
                      <label>{f.label} <span className="hint">({f.hint})</span></label>
                      <select value={data.mapping[f.key]} onChange={(e) => applyMapping(f.key, Number(e.target.value))}>
                        <option value={-1}>— tidak dipakai —</option>
                        {data.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {String.fromCharCode(65 + (i % 26))} · {h || "(kosong)"}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter & aksi */}
          <div className="toolbar" style={{ marginTop: "1rem" }}>
            <input placeholder="Cari nama atau faktur…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            <select value={ketFilter} onChange={(e) => { setKetFilter(e.target.value); setPage(1); }}>
              <option value="">Semua KET FU</option>
              {ketOptions.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select value={waFilter} onChange={(e) => { setWaFilter(e.target.value); setPage(1); }}>
              <option value="">Semua Nomor WA</option>
              <option value="valid">WA Valid</option>
              <option value="invalid">Perlu Diperiksa</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="file">Urutan file</option>
              <option value="nama">Nama A–Z</option>
              <option value="faktur">Faktur A–Z</option>
            </select>
          </div>

          <div className="toolbar-actions">
            <span className="count">
              {selected.size} dari {rows.length} baris dipilih · menampilkan {pageRows.length} baris
            </span>
            <button className="btn secondary" onClick={toggleAllFiltered}>
              {allFilteredSelected ? "BATAL PILIH SEMUA (hasil filter)" : "PILIH SEMUA (hasil filter)"}
            </button>
            <button className="btn secondary" onClick={() => setSelected(new Set())}>KOSONGKAN PILIHAN</button>
            <button className="btn" disabled={busy} onClick={() => void save()}>
              {busy ? "MENYIMPAN…" : `SIMPAN ${selected.size} BARIS KE DATABASE`}
            </button>
            <button className="btn danger" disabled={busy || rows.length === 0} onClick={clearAllRows}>
              HAPUS SEMUA DATA
            </button>
          </div>

          {/* Tabel preview */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} aria-label="Pilih semua" />
                  </th>
                  <th className="num">NO</th>
                  <th>FAKTUR</th>
                  <th>NAMA PEMOHON</th>
                  <th>NO HP</th>
                  <th>KET FU</th>
                  <th>STATUS WA</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const st = waStateOfRow(r);
                  const dup = dupSet.has(r.rowNumber);
                  return (
                    <tr key={r.rowNumber} className={dup ? "row-danger" : st === "invalid" ? "row-danger" : undefined}>
                      <td>
                        <input type="checkbox" checked={selected.has(r.rowNumber)} onChange={() => toggleRow(r.rowNumber)} aria-label={`Pilih baris ${r.rowNumber}`} />
                      </td>
                      <td className="num">{r.no || r.rowNumber}</td>
                      <td>
                        <input value={r.faktur} onChange={(e) => updateRow(r.rowNumber, { faktur: e.target.value })} style={{ minWidth: 110 }} />
                      </td>
                      <td>
                        <input value={r.nama} onChange={(e) => updateRow(r.rowNumber, { nama: e.target.value })} style={{ minWidth: 150 }} />
                      </td>
                      <td>
                        <input value={r.no_hp} onChange={(e) => updateRow(r.rowNumber, { no_hp: e.target.value })} style={{ minWidth: 120 }} />
                      </td>
                      <td>{r.ket_fu || "-"}</td>
                      <td>
                        {dup && <span className="warn" style={{ display: "block" }}>Duplikat</span>}
                        {st === "valid" ? "VALID" : st === "invalid" ? "TIDAK VALID" : "KOSONG"}
                      </td>
                      <td>
                        <button className="btn secondary" onClick={() => deleteRows([r.rowNumber])}>HAPUS</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pageRows.length === 0 && <div className="empty">Tidak ada baris yang cocok dengan filter.</div>}
          </div>

          {totalPages > 1 && (
            <div className="toolbar-actions" style={{ justifyContent: "center" }}>
              <button className="btn secondary" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>‹ SEBELUMNYA</button>
              <span className="count">Halaman {currentPage} / {totalPages}</span>
              <button className="btn secondary" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>BERIKUTNYA ›</button>
            </div>
          )}

          <p className="hint">
            Data belum tersimpan. Tekan &quot;SIMPAN KE DATABASE&quot; untuk memasukkan baris terpilih. Lihat hasilnya di{" "}
            <Link href="/riwayat-import">RIWAYAT IMPORT</Link>.
          </p>
        </>
      )}
    </>
  );
}
