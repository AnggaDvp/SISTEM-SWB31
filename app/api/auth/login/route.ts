import { NextResponse } from "next/server";
import { verifyLogin, serverError } from "@/lib/auth";
import { cookieOptions, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pembatas percobaan login sederhana (per instance server; pelengkap, bukan pengganti WAF).
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const now = Date.now();
    const rec = attempts.get(ip);
    if (rec && now - rec.first < WINDOW_MS && rec.count >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." }, { status: 429 });
    }

    const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";

    const user = await verifyLogin(email, password);
    if (!user) {
      if (!rec || now - rec.first >= WINDOW_MS) attempts.set(ip, { count: 1, first: now });
      else rec.count += 1;
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    attempts.delete(ip);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.email, user.role), {
      ...cookieOptions,
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (e) {
    return serverError(e);
  }
}
