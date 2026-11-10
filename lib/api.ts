import { NextResponse } from "next/server";

/** Respons error umum. Detail teknis hanya dicatat di log server, tidak dikirim ke pengguna. */
export function serverError(e: unknown): NextResponse {
  console.error(e);
  return NextResponse.json({ error: "Terjadi kesalahan pada server. Coba lagi." }, { status: 500 });
}
