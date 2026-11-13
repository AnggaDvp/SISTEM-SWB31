import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serverError } from "@/lib/api";
import { STATUSES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEAR_MATURITY = 5; // sisa angsuran <= 5 dianggap mau habis

export async function GET() {
  try {
    const db = await getDb();

    const [totals, statusRows, brandRows, blastToday, blast7d, blastMonth] = await Promise.all([
      db.execute({
        sql: `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN whatsapp NOT GLOB '*[^0-9]*'
                    AND length(whatsapp) BETWEEN 11 AND 14
                    AND whatsapp GLOB '628[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
                   THEN 1 ELSE 0 END) AS wa_valid,
          AVG(CASE WHEN tenor IS NOT NULL AND installment_running IS NOT NULL THEN (tenor - installment_running) END) AS avg_remaining,
          SUM(CASE WHEN tenor IS NOT NULL AND installment_running IS NOT NULL AND (tenor - installment_running) <= ? THEN 1 ELSE 0 END) AS near_maturity,
          SUM(CASE WHEN wa_status = 'Selesai Dikonfirmasi' THEN 1 ELSE 0 END) AS followed_up,
          SUM(CASE WHEN batch_id IS NULL THEN 1 ELSE 0 END) AS ro_total,
          SUM(CASE WHEN batch_id IS NOT NULL THEN 1 ELSE 0 END) AS blast_total,
          SUM(CASE WHEN batch_id IS NULL AND wa_status = 'Selesai Dikonfirmasi' THEN 1 ELSE 0 END) AS ro_followed_up,
          SUM(CASE WHEN batch_id IS NOT NULL AND wa_status = 'Selesai Dikonfirmasi' THEN 1 ELSE 0 END) AS blast_followed_up,
          SUM(CASE WHEN batch_id IS NOT NULL AND wa_status = 'Gagal' THEN 1 ELSE 0 END) AS blast_failed
        FROM customers`,
        args: [NEAR_MATURITY],
      }),
      db.execute({ sql: "SELECT comm_status AS status, COUNT(*) AS n FROM customers GROUP BY comm_status" }),
      db.execute({ sql: "SELECT brand, COUNT(*) AS n FROM customers GROUP BY brand ORDER BY n DESC" }),
      db.execute({ sql: "SELECT COUNT(*) AS n FROM blast_logs WHERE date(created_at) = date('now')" }),
      db.execute({ sql: "SELECT COUNT(*) AS n FROM blast_logs WHERE date(created_at) >= date('now', '-6 days')" }),
      db.execute({ sql: "SELECT COUNT(*) AS n FROM blast_logs WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')" }),
    ]);

    const t = totals.rows[0] as Record<string, unknown>;
    const total = Number(t.total ?? 0);
    const waValid = Number(t.wa_valid ?? 0);
    const avgRemaining = t.avg_remaining === null ? null : Math.round(Number(t.avg_remaining) * 10) / 10;
    const nearMaturity = Number(t.near_maturity ?? 0);

    const statusDist: Record<string, number> = {};
    for (const s of STATUSES) statusDist[s] = 0;
    for (const r of statusRows.rows) {
      const row = r as Record<string, unknown>;
      statusDist[String(row.status)] = Number(row.n);
    }

    const brandDist = brandRows.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return { brand: String(row.brand || "Lainnya"), n: Number(row.n) };
    });

    return NextResponse.json({
      total,
      wa_valid: waValid,
      avg_remaining: avgRemaining,
      near_maturity: nearMaturity,
      near_maturity_threshold: NEAR_MATURITY,
      status_distribution: statusDist,
      brand_distribution: brandDist,
      follow_up: {
        done: Number(t.followed_up ?? 0),
        not_followable: total - waValid,
        ro_total: Number(t.ro_total ?? 0),
        ro_done: Number(t.ro_followed_up ?? 0),
        blast_total: Number(t.blast_total ?? 0),
        blast_done: Number(t.blast_followed_up ?? 0),
        blast_failed: Number(t.blast_failed ?? 0),
      },
      blasts: {
        today: Number((blastToday.rows[0] as Record<string, unknown>).n ?? 0),
        last_7_days: Number((blast7d.rows[0] as Record<string, unknown>).n ?? 0),
        this_month: Number((blastMonth.rows[0] as Record<string, unknown>).n ?? 0),
        daily_limit: 50,
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
