import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getDb } from "./db";
import { getSession } from "./session";

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Format hash: salt:hash (hex), scrypt. Dipakai untuk akun petugas di tabel users. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyHash(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function verifyLogin(email: string, password: string): Promise<{ email: string; role: string } | null> {
  const e = email.trim().toLowerCase();
  if (!e || !password) return null;

  // Admin utama dari environment variable (password tidak pernah ada di source code).
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword && e === adminEmail) {
    return safeEqual(password, adminPassword) ? { email: e, role: "admin" } : null;
  }

  // Akun petugas tambahan (tabel users, password di-hash dengan scrypt).
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT email, password_hash, role FROM users WHERE email = ?", args: [e] });
  const row = res.rows[0];
  if (!row) {
    safeEqual(password, "dummy"); // samakan waktu respons
    return null;
  }
  return verifyHash(password, String(row.password_hash)) ? { email: String(row.email), role: String(row.role) } : null;
}

/** Periksa sesi login + asal request (anti-CSRF) untuk request yang mengubah data. */
export async function guard(req: Request): Promise<NextResponse | null> {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sesi berakhir. Silakan login kembali." }, { status: 401 });

  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    if (origin) {
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      try {
        if (new URL(origin).host !== host) throw new Error("origin");
      } catch {
        return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
      }
    }
  }
  return null;
}

export function serverError(e: unknown): NextResponse {
  console.error(e); // detail hanya di log server, tidak dikirim ke pengguna
  return NextResponse.json({ error: "Terjadi kesalahan pada server. Coba lagi." }, { status: 500 });
}
