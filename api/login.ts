import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";

const TEST_ACCOUNTS = ["mdore06@gmail.com", "michaelpatrick2335@gmail.com"];

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, email TEXT UNIQUE,
      name TEXT NOT NULL DEFAULT 'Seeker', tier TEXT NOT NULL DEFAULT 'newbie',
      level INTEGER NOT NULL DEFAULT 1, bananas INTEGER NOT NULL DEFAULT 0,
      total_sessions INTEGER NOT NULL DEFAULT 0, total_seconds_meditated INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0, last_session_date TEXT,
      is_premium BOOLEAN NOT NULL DEFAULT FALSE, free_sessions_used INTEGER NOT NULL DEFAULT 0,
      profile_pic TEXT, active_music_track TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS meditation_sessions (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, level INTEGER NOT NULL,
      tier TEXT NOT NULL, duration_seconds INTEGER NOT NULL, completed_at TEXT NOT NULL,
      bananas_earned INTEGER NOT NULL DEFAULT 1
    )
  `;
}

function rowToUser(row: any) {
  return {
    id: row.id, email: row.email ?? null, name: row.name, tier: row.tier,
    level: row.level, bananas: row.bananas, totalSessions: row.total_sessions,
    totalSecondsMediated: row.total_seconds_meditated, streakDays: row.streak_days,
    lastSessionDate: row.last_session_date ?? null, isPremium: row.is_premium,
    freeSessionsUsed: row.free_sessions_used, profilePic: row.profile_pic ?? null,
    activeMusicTrack: row.active_music_track ?? null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await ensureTables();
    const email = ((req.body?.email as string) || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email required" });

    const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (rows.length === 0) return res.status(404).json({ error: "No account found with that email" });

    let user = rows[0];
    if (TEST_ACCOUNTS.includes(email) && !user.is_premium) {
      const { rows: upd } = await sql`UPDATE users SET is_premium = TRUE WHERE id = ${user.id} RETURNING *`;
      user = upd[0];
    }
    return res.json(rowToUser(user));
  } catch (e: any) {
    return res.status(500).json({ error: e.message, type: e.constructor?.name });
  }
}
