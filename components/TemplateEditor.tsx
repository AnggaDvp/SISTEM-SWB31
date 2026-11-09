"use client";

import { useState } from "react";
import { DEFAULT_TEMPLATE, PLACEHOLDERS } from "@/lib/template";

type Props = { template: string; isDefault: boolean; onSaved: (template: string, isDefault: boolean) => void };

export default function TemplateEditor({ template, isDefault, onSaved }: Props) {
  const [text, setText] = useState(template);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(value: string) {
    setMsg("");
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Gagal menyimpan template.");
      setText(data.template);
      onSaved(data.template, data.isDefault);
      setMsg(data.isDefault ? "Template dikembalikan ke bawaan." : "Template tersimpan.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="card">
      <summary>Template Pesan WhatsApp {isDefault ? "(bawaan)" : "(diubah)"}</summary>
      <div style={{ marginTop: ".75rem" }}>
        {error && <div className="alert error">{error}</div>}
        {msg && <div className="alert success">{msg}</div>}
        <p className="hint" style={{ marginTop: 0 }}>
          Gunakan penanda berikut, akan otomatis diganti sesuai konsumen: {PLACEHOLDERS.join("  ")}
        </p>
        <textarea value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} />
        <div className="actions">
          <button className="btn" disabled={busy} onClick={() => void save(text)}>SIMPAN TEMPLATE</button>
          <button className="btn secondary" disabled={busy} onClick={() => void save("")}>KEMBALIKAN KE BAWAAN</button>
          <button className="btn secondary" disabled={busy} onClick={() => setText(DEFAULT_TEMPLATE)}>MUAT TEKS BAWAAN</button>
        </div>
      </div>
    </details>
  );
}
