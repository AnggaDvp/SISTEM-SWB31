"use client";

import { useEffect, useRef, useState } from "react";
import { STATUSES, type Customer } from "@/lib/types";
import { displayPhone } from "@/lib/validation";
import { buildMessage } from "@/lib/template";

type Props = {
  customer: Customer;
  template: string;
  image: string | null;
  imageName: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdated: (c: Customer) => void;
};

export default function DetailPanel({ customer: c, template, image, imageName, onClose, onEdit, onDelete, onUpdated }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  // Blob PNG gambar poster sudah dikonversi sebelumnya agar clipboard.write bisa dipanggil
  // langsung dalam gesture klik (tanpa await loading gambar yang memutus gesture).
  const imageBlobRef = useRef<Blob | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 12000);
  }

  // Pre-konversi gambar poster ke Blob PNG segera setelah gambar tersedia.
  useEffect(() => {
    imageBlobRef.current = null;
    if (!image) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) imageBlobRef.current = blob;
      }, "image/png");
    };
    img.src = image;
  }, [image]);

  async function changeStatus(status: string) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/customers/${c.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comm_status: status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Gagal memperbarui status.");
      onUpdated(data.customer as Customer);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  // Pesan dibuat saat tombol diklik, sehingga salam mengikuti jam saat itu (Asia/Jakarta).
  async function openWhatsApp() {
    if (!c.wa_valid) return;
    const msg = buildMessage(template, { name: c.name, contract_no: c.contract_no });

    let copied = false;
    if (image && imageBlobRef.current) {
      try {
        // Blob PNG sudah siap (pre-konversi), jadi clipboard.write dipanggil langsung dalam gesture klik.
        await navigator.clipboard.write([new ClipboardItem({ "image/png": imageBlobRef.current })]);
        copied = true;
      } catch {
        copied = false;
      }
    }

    const url = `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");

    if (!image) return;
    if (copied) {
      showToast("Gambar sudah disalin. Di WhatsApp tekan Ctrl+V (atau tekan lama → Tempel) untuk menempel gambar, lalu Kirim. Teks otomatis jadi keterangan.");
    } else {
      downloadDataUrl(image, imageName || "poster");
      showToast("Gambar gagal disalin. Gambar diunduh — silakan lampirkan manual di WhatsApp.");
    }
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    try {
      const a = document.createElement("a");
      a.href = dataUrl;
      const ext = dataUrl.split(";")[0].split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      a.download = filename.replace(/\.[^.]+$/, "") + "." + ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // abaikan jika unduh gagal.
    }
  }

  const rows: [string, string][] = [
    ["Nomor Kontrak", c.contract_no],
    ["Nomor WhatsApp", c.whatsapp ? displayPhone(c.whatsapp) : "-"],
    ["Plat Nomor", c.plate || "-"],
    ["Merek Motor", c.brand || "-"],
    ["Tipe Motor", c.motor_type || "-"],
    ["Lama Angsuran", c.tenor !== null ? `${c.tenor} Bulan` : "-"],
    ["Angsuran Berjalan", c.installment_running !== null ? `Ke-${c.installment_running}` : "-"],
    ["Sisa Angsuran", c.remaining !== null ? `${c.remaining} Bulan` : "-"],
  ];

  const waNote = !c.whatsapp
    ? "Nomor WhatsApp belum diisi. Lengkapi lewat EDIT DATA untuk mengaktifkan chat."
    : !c.wa_valid
      ? "Nomor WhatsApp tidak valid. Perbaiki lewat EDIT DATA untuk mengaktifkan chat."
      : "";

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`Detail ${c.name}`}>
        <div className="drawer-head">
          <h2>{c.name}</h2>
          <button className="close" onClick={onClose} aria-label="Tutup">×</button>
        </div>

        {error && <div className="alert error">{error}</div>}
        {toast && (
          <div className="alert success" style={{ position: "sticky", top: 0, zIndex: 5 }}>
            {toast}
          </div>
        )}

        <div className="table-wrap" style={{ marginBottom: "1rem" }}>
          <table className="detail-table">
            <thead>
              <tr><th>Data</th><th>Keterangan</th></tr>
            </thead>
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}><td>{k}</td><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="field">
          <label htmlFor="comm_status">Status Komunikasi</label>
          <select id="comm_status" value={c.comm_status} disabled={busy} onChange={(e) => void changeStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="actions">
          <button className="btn" disabled={!c.wa_valid} onClick={openWhatsApp}>CHAT WHATSAPP</button>
          <button className="btn secondary" onClick={onEdit}>EDIT DATA</button>
          <button className="btn danger" onClick={onDelete}>HAPUS DATA</button>
        </div>
        {waNote && <div className="warn" style={{ marginTop: ".6rem" }}>{waNote}</div>}
        {c.wa_valid && (
          <div className="hint" style={{ marginTop: ".6rem" }}>
            WhatsApp akan terbuka dengan pesan teks terisi.{image ? " Gambar poster otomatis disalin — tinggal tekan Ctrl+V (tempel) di WhatsApp, lalu Kirim. Teks akan jadi keterangan gambar." : ""} Pesan baru terkirim setelah Anda menekan Kirim di WhatsApp.
          </div>
        )}

        {c.wa_valid && (
          <details style={{ marginTop: "1rem" }}>
            <summary>Lihat pesan yang akan dikirim</summary>
            <div className="preview">{buildMessage(template, { name: c.name, contract_no: c.contract_no })}</div>
            {image && (
              <div style={{ marginTop: ".75rem" }}>
                <div className="hint" style={{ marginBottom: ".4rem" }}>Gambar poster yang dilampirkan:</div>
                <img
                  src={image}
                  alt="Poster promo"
                  style={{ maxWidth: "100%", maxHeight: "320px", border: "1px solid #ddd", borderRadius: 8 }}
                />
              </div>
            )}
          </details>
        )}
      </aside>
    </>
  );
}
