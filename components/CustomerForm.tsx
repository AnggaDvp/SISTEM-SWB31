"use client";

import { useMemo, useState } from "react";
import { BRANDS, MAX_TENOR, type Customer } from "@/lib/types";
import { displayPhone, isWhatsappValid, normalizePhone } from "@/lib/validation";
import { searchMotorTypes } from "@/lib/motor-types";

type Props = {
  mode: "create" | "edit";
  initial?: Customer;
  onSaved?: (c: Customer) => void;
  onCancel?: () => void;
};

type FormState = {
  contract_no: string;
  name: string;
  whatsapp: string;
  plate: string;
  brand: string;
  motor_type: string;
  tenor: string;
  running: string;
};

const EMPTY: FormState = { contract_no: "", name: "", whatsapp: "", plate: "", brand: "", motor_type: "", tenor: "", running: "" };

function fromCustomer(c?: Customer): FormState {
  if (!c) return EMPTY;
  return {
    contract_no: c.contract_no,
    name: c.name,
    whatsapp: displayPhone(c.whatsapp),
    plate: c.plate,
    brand: c.brand,
    motor_type: c.motor_type,
    tenor: c.tenor === null ? "" : String(c.tenor),
    running: c.installment_running === null ? "" : String(c.installment_running),
  };
}

export default function CustomerForm({ mode, initial, onSaved, onCancel }: Props) {
  const [f, setF] = useState<FormState>(() => fromCustomer(initial));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const tenorN = f.tenor ? Number(f.tenor) : null;
  const runningN = f.running === "" ? null : Number(f.running);
  const remaining = tenorN !== null && runningN !== null && Number.isFinite(runningN) ? tenorN - runningN : null;

  const waNormalized = normalizePhone(f.whatsapp);
  const waState: "empty" | "valid" | "invalid" = !waNormalized ? "empty" : isWhatsappValid(waNormalized) ? "valid" : "invalid";

  const suggestions = useMemo(() => (f.brand ? searchMotorTypes(f.brand, f.motor_type) : []), [f.brand, f.motor_type]);

  function reset() {
    setF(mode === "edit" ? fromCustomer(initial) : EMPTY);
    setError("");
    setSuccess("");
    setDuplicate(false);
  }

  async function save(overwrite = false) {
    setError("");
    setSuccess("");
    setDuplicate(false);

    if (!f.contract_no.trim()) return setError("Nomor Kontrak wajib diisi.");
    if (!f.name.trim()) return setError("Nama Konsumen wajib diisi.");
    if (runningN !== null && (!Number.isInteger(runningN) || runningN < 0)) return setError("Angsuran berjalan harus angka bulat 0 atau lebih.");
    if (runningN !== null && tenorN === null) return setError("Pilih tenor terlebih dahulu.");
    if (runningN !== null && tenorN !== null && runningN > tenorN) return setError("Angsuran berjalan tidak boleh lebih besar dari tenor.");

    const payload = {
      contract_no: f.contract_no,
      name: f.name,
      whatsapp: f.whatsapp,
      plate: f.plate,
      brand: f.brand,
      motor_type: f.motor_type,
      tenor: tenorN,
      installment_running: runningN,
    };

    setBusy(true);
    try {
      const url = mode === "edit" && initial ? `/api/customers/${initial.id}` : `/api/customers${overwrite ? "?overwrite=true" : ""}`;
      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 409 && data.code === "DUPLICATE") {
        setError(data.error);
        if (mode === "create") setDuplicate(true);
        return;
      }
      if (!res.ok) return setError(data.error ?? "Gagal menyimpan data.");

      const saved = data.customer as Customer;
      if (mode === "create") {
        setSuccess(overwrite ? "Data yang sudah ada berhasil diperbarui." : "Data berhasil disimpan. Lihat di TABLE DATA.");
        setF(EMPTY);
      }
      onSaved?.(saved);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
      {duplicate && (
        <div className="actions" style={{ marginTop: 0, marginBottom: ".9rem" }}>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => void save(true)}>
            PERBARUI DATA YANG SUDAH ADA
          </button>
        </div>
      )}

      <div className="section-title" style={{ marginTop: 0 }}>Data Konsumen</div>
      <div className="field">
        <label htmlFor="contract_no">Nomor Kontrak <span className="req">*</span></label>
        <input id="contract_no" inputMode="numeric" value={f.contract_no} maxLength={50} onChange={(e) => set("contract_no", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="name">Nama Konsumen <span className="req">*</span></label>
        <input id="name" value={f.name} maxLength={120} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="whatsapp">Nomor WhatsApp</label>
        <input id="whatsapp" type="tel" inputMode="tel" placeholder="08..., 62..., atau +62..." value={f.whatsapp} maxLength={20} onChange={(e) => set("whatsapp", e.target.value)} />
        {waState === "invalid" && <div className="warn">Nomor tidak valid — tombol Chat WhatsApp akan nonaktif.</div>}
        {waState === "empty" && <div className="hint">Boleh dikosongkan. Chat WhatsApp aktif setelah nomor valid diisi.</div>}
        {waState === "valid" && <div className="hint">Nomor valid (62{waNormalized.slice(2)}).</div>}
      </div>

      <div className="section-title">Informasi Kendaraan</div>
      <div className="field">
        <label htmlFor="plate">Plat Nomor Motor</label>
        <input id="plate" placeholder="B 5678 DEF" value={f.plate} maxLength={20} onChange={(e) => set("plate", e.target.value.toUpperCase())} />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="brand">Merek Motor</label>
          <select id="brand" value={f.brand} onChange={(e) => setF((p) => ({ ...p, brand: e.target.value, motor_type: p.brand === e.target.value ? p.motor_type : "" }))}>
            <option value="">— Pilih —</option>
            {BRANDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="motor_type">Tipe Motor</label>
          <input
            id="motor_type"
            autoComplete="off"
            placeholder={f.brand ? "Ketik untuk mencari..." : "Pilih merek dulu"}
            value={f.motor_type}
            maxLength={80}
            onChange={(e) => {
              set("motor_type", e.target.value);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setShowSuggest(false)}
          />
          {showSuggest && suggestions.length > 0 && (
            <div className="suggest">
              {suggestions.map((m) => (
                <button
                  type="button"
                  key={m.brand + m.name}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    set("motor_type", m.name);
                    setShowSuggest(false);
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="hint" style={{ marginTop: "-.5rem", marginBottom: ".9rem" }}>
        Tipe tidak ada di daftar? Ketik manual saja.
      </div>

      <div className="section-title">Informasi Angsuran</div>
      <div className="field">
        <label htmlFor="tenor">Pilih Tenor</label>
        <select
          id="tenor"
          value={f.tenor}
          onChange={(e) => {
            const t = e.target.value;
            setF((p) => ({ ...p, tenor: t, running: t && p.running !== "" && Number(p.running) > Number(t) ? "" : p.running }));
          }}
        >
          <option value="">— Pilih —</option>
          {Array.from({ length: MAX_TENOR }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} Bulan</option>
          ))}
        </select>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="running">Angsuran Berjalan</label>
          <input
            id="running"
            type="number"
            inputMode="numeric"
            min={0}
            max={tenorN ?? undefined}
            step={1}
            placeholder="Contoh: 5"
            value={f.running}
            onChange={(e) => set("running", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="remaining">Sisa Angsuran</label>
          <input id="remaining" readOnly value={remaining !== null && remaining >= 0 ? `${remaining} Bulan` : ""} placeholder="Otomatis" />
        </div>
      </div>

      <div className="actions">
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "MENYIMPAN..." : mode === "edit" ? "SIMPAN PERUBAHAN" : "SIMPAN DATA"}
        </button>
        <button type="button" className="btn secondary" onClick={reset} disabled={busy}>
          RESET FORM
        </button>
        {onCancel && (
          <button type="button" className="btn secondary" onClick={onCancel} disabled={busy}>
            BATAL
          </button>
        )}
      </div>
    </form>
  );
}
