"use client";

import { useRef, useState } from "react";
import { DEFAULT_TEMPLATE, MAX_IMAGE_BYTES, PLACEHOLDERS } from "@/lib/template";

type Props = {
  template: string;
  isDefault: boolean;
  image: string | null;
  imageName: string | null;
  onSaved: (template: string, isDefault: boolean, image: string | null, imageName: string | null) => void;
};

export default function TemplateEditor({ template, isDefault, image, imageName, onSaved }: Props) {
  const [text, setText] = useState(template);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(image);
  const [imgName, setImgName] = useState<string | null>(imageName);
  const fileRef = useRef<HTMLInputElement>(null);

  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
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
      onSaved(data.template, data.isDefault, data.image ?? null, data.imageName ?? null);
      setMsg("Perubahan tersimpan.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
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

  function removeImage() {
    setImgPreview(null);
    setImgName(null);
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

        {/* ---- Gambar poster ---- */}
        <div className="field" style={{ marginTop: "1rem" }}>
          <label>Gambar Poster (dikirim bersama pesan WhatsApp)</label>
          {imgPreview ? (
            <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", alignItems: "flex-start" }}>
              <img
                src={imgPreview}
                alt="Preview poster"
                style={{ maxWidth: "240px", maxHeight: "240px", border: "1px solid #ddd", borderRadius: 8 }}
              />
              <span className="hint">{imgName ?? "poster"}</span>
              <button type="button" className="btn secondary" onClick={removeImage}>HAPUS GAMBAR</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" className="btn secondary" onClick={() => fileRef.current?.click()}>
                PILIH GAMBAR
              </button>
              <span className="hint">JPG/PNG/GIF/WebP, maks {MAX_IMAGE_BYTES / 1024 / 1024} MB</span>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            hidden
            onChange={(e) => void onPickFile(e)}
          />
          <p className="hint">
            Gambar ini akan diunduh otomatis saat tombol CHAT WHATSAPP diklik, lalu Anda lampirkan di WhatsApp sebelum menekan Kirim.
          </p>
        </div>

        <div className="actions">
          <button className="btn" disabled={busy} onClick={() => void save()}>SIMPAN</button>
          <button className="btn secondary" disabled={busy} onClick={() => { setText(DEFAULT_TEMPLATE); }}>MUAT TEKS BAWAAN</button>
        </div>
      </div>
    </details>
  );
}
