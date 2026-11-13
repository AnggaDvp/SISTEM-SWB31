"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGE_BYTES } from "@/lib/template";

export default function PromoClient() {
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/template", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setImage(typeof d.image === "string" ? d.image : null);
        setImageName(typeof d.imageName === "string" ? d.imageName : null);
      })
      .catch(() => undefined);
  }, []);

  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setNotice("");
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
      setDraft(dataUrl);
      setDraftName(file.name);
    } catch {
      setError("Gagal membaca gambar.");
    } finally {
      e.target.value = "";
    }
  }

  async function savePoster() {
    if (!draft) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: draft, imageName: draftName }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? "Gagal menyimpan poster.");
      setImage(typeof d.image === "string" ? d.image : null);
      setImageName(typeof d.imageName === "string" ? d.imageName : null);
      setDraft(null);
      setDraftName(null);
      setNotice("Poster aktif diperbarui.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  async function removePoster() {
    if (!window.confirm("Hapus poster aktif?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: null, imageName: null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? "Gagal menghapus poster.");
      setImage(null);
      setImageName(null);
      setDraft(null);
      setDraftName(null);
      setNotice("Poster dihapus.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  function download(dataUrl: string, name: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    const ext = dataUrl.split(";")[0].split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    a.download = name.replace(/\.[^.]+$/, "") + "." + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <>
      <h1>MATERI PROMOSI</h1>
      <p className="hint" style={{ marginTop: "-.5rem" }}>
        Poster promo NSS VAGANZA yang dilampirkan manual saat menghubungi konsumen. WhatsApp Click-to-Chat hanya
        mengisi teks — gambar dikirim manual oleh admin.
      </p>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="dashboard-row">
        <div className="card">
          <h2>Poster Aktif</h2>
          {image ? (
            <>
              <img src={image} alt="Poster aktif" style={{ maxWidth: "100%", maxHeight: 420, border: "1px solid var(--red-line)", borderRadius: 8 }} />
              <p className="hint">{imageName || "poster"}</p>
              <div className="actions">
                <button className="btn secondary" onClick={() => download(image, imageName || "poster")}>DOWNLOAD POSTER</button>
                <button className="btn danger" disabled={busy} onClick={() => void removePoster()}>HAPUS POSTER</button>
              </div>
            </>
          ) : (
            <p className="hint">Belum ada poster aktif. Unggah poster di sebelah kanan.</p>
          )}
        </div>

        <div className="card">
          <h2>Unggah / Ganti Poster</h2>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(e) => void onPick(e)} />
          <div className="actions">
            <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>PILIH GAMBAR</button>
          </div>
          <p className="hint">Format JPG/PNG/GIF/WebP, maksimal {MAX_IMAGE_BYTES / 1024 / 1024} MB.</p>

          {draft && (
            <>
              <img src={draft} alt="Pratinjau poster baru" style={{ maxWidth: "100%", maxHeight: 300, border: "1px solid var(--red-line)", borderRadius: 8, marginTop: ".5rem" }} />
              <p className="hint">{draftName}</p>
              <div className="actions">
                <button className="btn" disabled={busy} onClick={() => void savePoster()}>
                  {busy ? "MENYIMPAN…" : "JADIKAN POSTER AKTIF"}
                </button>
                <button className="btn secondary" disabled={busy} onClick={() => { setDraft(null); setDraftName(null); }}>
                  BATAL
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
