"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_TEMPLATE, MAX_IMAGE_BYTES, PLACEHOLDERS, buildMessage } from "@/lib/template";

const SAMPLE = { name: "Budi Santoso", contract_no: "12240903217" };

export default function TemplatePage() {
  const [text, setText] = useState(DEFAULT_TEMPLATE);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgName, setImgName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Muat template tersimpan saat halaman dibuka.
  useEffect(() => {
    let alive = true;
    fetch("/api/template", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (typeof d.template === "string") setText(d.template);
        setImgPreview(typeof d.image === "string" ? d.image : null);
        setImgName(typeof d.imageName === "string" ? d.imageName : null);
      })
      .catch(() => undefined)
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Ukuran gambar maksimal ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
      e.target.value = "";
      return;
    }
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
      setError("Format gambar harus JPG, PNG, GIF, atau WebP.");
      e.target.value = "";
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      setImgPreview(dataUrl);
      setImgName(file.name);
    } catch {
      setError("Gagal membaca gambar.");
    } finally {
      e.target.value = "";
    }
  }

  function insertPlaceholder(p: string) {
    setText((prev) => prev + p);
  }

  async function save() {
    setMsg("");
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: text, image: imgPreview, imageName: imgName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Gagal menyimpan.");
      setText(data.template);
      setImgPreview(data.image ?? null);
      setImgName(data.imageName ?? null);
      setMsg("Perubahan tersimpan.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  const preview = buildMessage(text, SAMPLE);

  return (
    <div>
      <h1>TEMPLATE BLAST WHATSAPP</h1>
      {error && <div className="alert error">{error}</div>}
      {msg && <div className="alert success">{msg}</div>}

      <div className="template-layout">
        <div className="card">
          <label>Pesan Template</label>
          <div className="placeholder-buttons">
            {PLACEHOLDERS.map((p) => (
              <button key={p} type="button" className="btn secondary" onClick={() => insertPlaceholder(p)}>
                + {p}
              </button>
            ))}
          </div>
          <p className="hint">Klik tombol di atas untuk menyisipkan penanda. Penanda otomatis diganti data konsumen saat blast.</p>
          <textarea value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} />

          <div className="field" style={{ marginTop: "1rem" }}>
            <label>Gambar Poster (dikirim bersama pesan WhatsApp)</label>
            {imgPreview ? (
              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", alignItems: "flex-start" }}>
                <img src={imgPreview} alt="Preview poster" style={{ maxWidth: "240px", maxHeight: "240px", border: "1px solid #ddd", borderRadius: 8 }} />
                <span className="hint">{imgName ?? "poster"}</span>
                <button type="button" className="btn secondary" onClick={() => { setImgPreview(null); setImgName(null); }}>HAPUS GAMBAR</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" className="btn secondary" onClick={() => fileRef.current?.click()}>PILIH GAMBAR</button>
                <span className="hint">JPG/PNG/GIF/WebP, maks {MAX_IMAGE_BYTES / 1024 / 1024} MB</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={(e) => void onPickFile(e)} />
          </div>

          <div className="actions">
            <button className="btn" disabled={busy || !loaded} onClick={() => void save()}>SIMPAN</button>
            <button className="btn secondary" disabled={busy} onClick={() => setText(DEFAULT_TEMPLATE)}>MUAT TEKS BAWAAN</button>
          </div>
        </div>

        <div className="card">
          <label>Pratinjau Pesan (contoh data)</label>
          <div className="preview" style={{ minHeight: "260px" }}>{preview}</div>
          {imgPreview && (
            <div style={{ marginTop: "1rem" }}>
              <label>Gambar yang akan dikirim</label>
              <img src={imgPreview} alt="Poster" style={{ maxWidth: "100%", maxHeight: "200px", border: "1px solid #ddd", borderRadius: 8, marginTop: ".25rem" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
