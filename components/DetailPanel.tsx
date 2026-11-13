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

// Waktu tersimpan dalam UTC ("YYYY-MM-DD HH:MM:SS"); tampilkan dalam zona Asia/Jakarta.
function formatJakarta(value: string | null): string {
  if (!value) return "-";
  const iso = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(d);
}

export default function DetailPanel({ customer: c, template, image, imageName, onClose, onEdit, onDelete, onUpdated }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  // Kondisi: petugas menandai nomor tidak bisa dihubungi di WhatsApp,
  // lalu memilih menghapus nomor atau mempertahankannya.
  const [askUnreachable, setAskUnreachable] = useState(false);
  const [busyWa, setBusyWa] = useState(false);
  // Riwayat blast: berapa kali konsumen ini dihubungi & kapan terakhir.
  const [blast, setBlast] = useState<{ count: number; last_at: string | null } | null>(null);
  // Blob PNG gambar poster sudah dikonversi sebelumnya agar clipboard.write bisa dipanggil
  // langsung dalam gesture klik (tanpa await loading gambar yang memutus gesture).
  const imageBlobRef = useRef<Blob | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 12000);
  }

  // Ambil riwayat blast konsumen ini (jumlah + waktu terakhir dihubungi).
  useEffect(() => {
    let alive = true;
    setBlast(null);
    fetch(`/api/customers/${c.id}/blasts`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (alive) setBlast({ count: Number(d.count ?? 0), last_at: d.last_at ?? null });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [c.id]);

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

  // Hapus nomor WhatsApp (kosongkan) ketika nomor tidak bisa dihubungi di WA.
  async function clearWhatsapp() {
    setError("");
    setBusyWa(true);
    try {
      const res = await fetch(`/api/customers/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Gagal menghapus nomor WhatsApp.");
      setAskUnreachable(false);
      onUpdated(data.customer as Customer);
      showToast("Nomor WhatsApp dihapus.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusyWa(false);
    }
  }

  // Pesan dibuat saat tombol diklik, sehingga salam mengikuti jam saat itu (Asia/Jakarta).
  async function openWhatsApp() {
    if (!c.wa_valid) return;

    // Catat aksi blast ke server (fire-and-forget; tidak menghalangi pembukaan WhatsApp).
    fetch("/api/blasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: c.id }),
    }).catch(() => undefined);
    // Perbarui tampilan riwayat langsung tanpa perlu memuat ulang.
    setBlast((b) => ({ count: (b?.count ?? 0) + 1, last_at: new Date().toISOString() }));

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
    ["Jumlah Blast", blast ? `${blast.count} kali` : "..."],
    ["Terakhir Dihubungi", blast ? formatJakarta(blast.last_at) : "..."],
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

        {!!c.whatsapp && (
          <div style={{ marginTop: ".6rem" }}>
            {!askUnreachable ? (
              <button className="btn secondary" style={{ width: "100%" }} onClick={() => setAskUnreachable(true)}>
                NOMOR TIDAK BISA DIHUBUNGI DI WA
              </button>
            ) : (
              <div className="alert error" style={{ marginBottom: 0 }}>
                <div style={{ marginBottom: ".5rem" }}>
                  Nomor {displayPhone(c.whatsapp)} tidak bisa dihubungi di WhatsApp. Hapus nomor atau pertahankan?
                </div>
                <div className="actions" style={{ marginTop: 0 }}>
                  <button className="btn danger" disabled={busyWa} onClick={() => void clearWhatsapp()}>
                    {busyWa ? "MENGHAPUS..." : "HAPUS NOMOR"}
                  </button>
                  <button className="btn secondary" disabled={busyWa} onClick={() => setAskUnreachable(false)}>
                    PERTAHANKAN
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
