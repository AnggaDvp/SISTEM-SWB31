import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { guard, serverError } from "@/lib/auth";
import {
  DEFAULT_TEMPLATE,
  TEMPLATE_KEY,
  WA_IMAGE_KEY,
  WA_IMAGE_NAME_KEY,
  MAX_IMAGE_BYTES,
} from "@/lib/template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_URL_RE = /^data:image\/(jpeg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/;

async function getSetting(db: ReturnType<typeof getDb> extends Promise<infer T> ? T : never, key: string) {
  const res = await db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [key] });
  return res.rows[0] ? String(res.rows[0].value) : null;
}

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    const db = await getDb();
    const [tplRes, imgRes, nameRes] = await Promise.all([
      db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [TEMPLATE_KEY] }),
      db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [WA_IMAGE_KEY] }),
      db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [WA_IMAGE_NAME_KEY] }),
    ]);
    const saved = tplRes.rows[0] ? String(tplRes.rows[0].value) : null;
    const image = imgRes.rows[0] ? String(imgRes.rows[0].value) : null;
    const imageName = nameRes.rows[0] ? String(nameRes.rows[0].value) : null;
    return NextResponse.json({
      template: saved ?? DEFAULT_TEMPLATE,
      isDefault: saved === null,
      image: image ?? null,
      imageName: imageName ?? null,
    });
  } catch (e) {
    return serverError(e);
  }
}

// Body { template?: string, image?: string|null, imageName?: string }
// - template kosong ("") = kembali ke bawaan.
// - image null/"" = hapus gambar. image berupa data URL image/* (base64).
export async function PUT(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    const body = (await req.json().catch(() => null)) as {
      template?: unknown;
      image?: unknown;
      imageName?: unknown;
    } | null;

    const db = await getDb();

    // ---- Template teks ----
    let template = savedOrNull<string>(body, "template");
    if (template !== undefined) {
      if (typeof template !== "string") return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
      template = template.replace(/\r\n/g, "\n");
      if (template.length > 4000) return NextResponse.json({ error: "Template maksimal 4000 karakter." }, { status: 400 });
      if (!template.trim()) {
        await db.execute({ sql: "DELETE FROM settings WHERE key = ?", args: [TEMPLATE_KEY] });
      } else {
        await upsertSetting(db, TEMPLATE_KEY, template);
      }
    }

    // ---- Gambar poster ----
    const image = savedOrNull<string | null>(body, "image");
    if (image !== undefined) {
      if (image === null || image === "") {
        await db.execute({ sql: "DELETE FROM settings WHERE key IN (?, ?)", args: [WA_IMAGE_KEY, WA_IMAGE_NAME_KEY] });
      } else if (typeof image === "string") {
        const m = image.match(DATA_URL_RE);
        if (!m) return NextResponse.json({ error: "Format gambar tidak valid. Gunakan JPG/PNG/GIF/WebP." }, { status: 400 });
        // Estimasi ukuran byte dari base64.
        const approxBytes = Math.floor((m[2].length * 3) / 4);
        if (approxBytes > MAX_IMAGE_BYTES) {
          return NextResponse.json({ error: `Ukuran gambar maksimal ${MAX_IMAGE_BYTES / 1024 / 1024} MB.` }, { status: 400 });
        }
        await upsertSetting(db, WA_IMAGE_KEY, image);
        const imageName = typeof body?.imageName === "string" ? body.imageName.slice(0, 120) : "poster";
        await upsertSetting(db, WA_IMAGE_NAME_KEY, imageName);
      } else {
        return NextResponse.json({ error: "Data gambar tidak valid." }, { status: 400 });
      }
    }

    // ---- Respon: baca kembali nilai akhir ----
    const [tplRes, imgRes, nameRes] = await Promise.all([
      db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [TEMPLATE_KEY] }),
      db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [WA_IMAGE_KEY] }),
      db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [WA_IMAGE_NAME_KEY] }),
    ]);
    const saved = tplRes.rows[0] ? String(tplRes.rows[0].value) : null;
    return NextResponse.json({
      template: saved ?? DEFAULT_TEMPLATE,
      isDefault: saved === null,
      image: imgRes.rows[0] ? String(imgRes.rows[0].value) : null,
      imageName: nameRes.rows[0] ? String(nameRes.rows[0].value) : null,
    });
  } catch (e) {
    return serverError(e);
  }
}

function savedOrNull<T>(body: { [k: string]: unknown } | null, key: string): T | undefined {
  if (body && key in body) return body[key] as T;
  return undefined;
}

async function upsertSetting(db: Awaited<ReturnType<typeof getDb>>, key: string, value: string) {
  await db.execute({
    sql: `INSERT INTO settings (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: [key, value],
  });
}
