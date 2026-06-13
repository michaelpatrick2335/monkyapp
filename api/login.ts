import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";

const TEST_ACCOUNTS = ["mdore06@gmail.com", "michaelpatrick2335@gmail.com"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let pool: Pool | null = null;
  try {
    const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connStr) return res.status(500).json({ error: "DATABASE_URL not set" });

    pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, email TEXT UNIQUE,
        name TEXT NOT NULL DEFAULT 'Seeker', tier TEXT NOT NULL DEFAULT 'newbie',
        level INTEGER NOT NULL DEFAULT 1, bananas INTEGER NOT NULL DEFAULT 0,
        total_sessions INTEGER NOT NULL DEFAULT 0, total_seconds_meditated INTEGER NOT NULL DEFAULT 0,
        streak_days INTEGER NOT NULL DEFAULT 0, last_session_date TEXT,
        is_premium BOOLEAN NOT NULL DEFAULT FALSE, free_sessions_used INTEGER NOT NULL DEFAULT 0,
        profile_pic TEXT, active_music_track TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS meditation_sessions (
        id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, level INTEGER NOT NULL,
        tier TEXT NOT NULL, duration_seconds INTEGER NOT NULL, completed_at TEXT NOT NULL,
        bananas_earned INTEGER NOT NULL DEFAULT 1
      );
    `);

    const email = ((req.body?.email as string) || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email required" });

    const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (r.rows.length === 0) return res.status(404).json({ error: "No account found with that email" });

    let user = r.rows[0];
    if (TEST_ACCOUNTS.includes(email) && !user.is_premium) {
      const upd = await pool.query("UPDATE users SET is_premium = TRUE WHERE id = $1 RETURNING *", [user.id]);
      user = upd.rows[0];
    }

    return res.json({
      id: user.id, email: user.email, name: user.name, tier: user.tier, level: user.level,
      bananas: user.bananas, totalSessions: user.total_sessions, totalSecondsMediated: user.total_seconds_meditated,
      streakDays: user.streak_days, lastSessionDate: user.last_session_date, isPremium: user.is_premium,
      freeSessionsUsed: user.free_sessions_used, profilePic: user.profile_pic, activeMusicTrack: user.active_music_track
    });
  } catch (e: any) {
    console.error("login error:", e);
    return res.status(500).json({ error: e.message, type: e.constructor?.name, stack: e.stack?.substring(0, 300) });
  } finally {
    if (pool) await pool.end().catch(() => {});
  }
}
