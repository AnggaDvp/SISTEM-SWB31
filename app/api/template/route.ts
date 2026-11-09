import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { guard, serverError } from "@/lib/auth";
import { DEFAULT_TEMPLATE, TEMPLATE_KEY } from "@/lib/template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    const db = await getDb();
    const res = await db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [TEMPLATE_KEY] });
    const saved = res.rows[0] ? String(res.rows[0].value) : null;
    return NextResponse.json({ template: saved ?? DEFAULT_TEMPLATE, isDefault: saved === null });
  } catch (e) {
    return serverError(e);
  }
}

// Body { template: string }. Template kosong = kembali ke bawaan.
export async function PUT(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    const body = (await req.json().catch(() => null)) as { template?: unknown } | null;
    if (typeof body?.template !== "string") return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    const template = body.template.replace(/\r\n/g, "\n");
    if (template.length > 4000) return NextResponse.json({ error: "Template maksimal 4000 karakter." }, { status: 400 });

    const db = await getDb();
    if (!template.trim()) {
      await db.execute({ sql: "DELETE FROM settings WHERE key = ?", args: [TEMPLATE_KEY] });
      return NextResponse.json({ template: DEFAULT_TEMPLATE, isDefault: true });
    }
    await db.execute({
      sql: `INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      args: [TEMPLATE_KEY, template],
    });
    return NextResponse.json({ template, isDefault: false });
  } catch (e) {
    return serverError(e);
  }
}
