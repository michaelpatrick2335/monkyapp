import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";

const TEST_ACCOUNTS = ["mdore06@gmail.com", "michaelpatrick2335@gmail.com"];
function makePool() { return new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } }); }
async function ensureTables(pool: Pool) { await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE, name TEXT NOT NULL DEFAULT 'Seeker', tier TEXT NOT NULL DEFAULT 'newbie', level INTEGER NOT NULL DEFAULT 1, bananas INTEGER NOT NULL DEFAULT 0, total_sessions INTEGER NOT NULL DEFAULT 0, total_seconds_meditated INTEGER NOT NULL DEFAULT 0, streak_days INTEGER NOT NULL DEFAULT 0, last_session_date TEXT, is_premium BOOLEAN NOT NULL DEFAULT FALSE, free_sessions_used INTEGER NOT NULL DEFAULT 0, profile_pic TEXT, active_music_track TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE TABLE IF NOT EXISTS meditation_sessions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, level INTEGER NOT NULL, tier TEXT NOT NULL, duration_seconds INTEGER NOT NULL, completed_at TEXT NOT NULL, bananas_earned INTEGER NOT NULL DEFAULT 1);`); }
function rowToUser(row: any) { return { id: row.id, email: row.email ?? null, name: row.name, tier: row.tier, level: row.level, bananas: row.bananas, totalSessions: row.total_sessions, totalSecondsMediated: row.total_seconds_meditated, streakDays: row.streak_days, lastSessionDate: row.last_session_date ?? null, isPremium: row.is_premium, freeSessionsUsed: row.free_sessions_used, profilePic: row.profile_pic ?? null, activeMusicTrack: row.active_music_track ?? null }; }
function getEmail(h: any): string | null { const raw = h["x-user-email"]; const v = Array.isArray(raw) ? raw[0] : raw; return v ? v.trim().toLowerCase() : null; }
async function getOrCreate(pool: Pool, email: string | null) { if (email) { const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]); if (r.rows.length > 0) { const u = r.rows[0]; if (TEST_ACCOUNTS.includes(email) && !u.is_premium) { const upd = await pool.query("UPDATE users SET is_premium = TRUE WHERE id = $1 RETURNING *", [u.id]); return upd.rows[0]; } return u; } const p = TEST_ACCOUNTS.includes(email); const r2 = await pool.query("INSERT INTO users (email, is_premium) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET email=EXCLUDED.email RETURNING *", [email, p]); return r2.rows[0]; } const r = await pool.query("SELECT * FROM users WHERE email IS NULL ORDER BY id LIMIT 1"); if (r.rows.length > 0) return r.rows[0]; const r2 = await pool.query("INSERT INTO users DEFAULT VALUES RETURNING *"); return r2.rows[0]; }
const CM: Record<string,string> = { name:"name",tier:"tier",level:"level",bananas:"bananas",totalSessions:"total_sessions",totalSecondsMediated:"total_seconds_meditated",streakDays:"streak_days",lastSessionDate:"last_session_date",isPremium:"is_premium",freeSessionsUsed:"free_sessions_used",profilePic:"profile_pic",activeMusicTrack:"active_music_track",email:"email" };
async function updateUser(pool: Pool, id: number, f: Record<string,any>) { const sets:string[]=[]; const vals:any[]=[]; let i=1; for(const[k,v] of Object.entries(f)){if(CM[k]){sets.push(`${CM[k]}=$${i++}`);vals.push(v);}} if(!sets.length){const r=await pool.query("SELECT * FROM users WHERE id=$1",[id]);return r.rows[0];} vals.push(id); const r=await pool.query(`UPDATE users SET ${sets.join(",")} WHERE id=$${i} RETURNING *`,vals); return r.rows[0]; }
function corsH(res: any) { res.setHeader("Access-Control-Allow-Origin","*"); res.setHeader("Access-Control-Allow-Headers","Content-Type, x-user-email"); res.setHeader("Access-Control-Allow-Methods","GET,POST,PATCH,DELETE,OPTIONS"); }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  corsH(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const pool = makePool();
  try {
    await ensureTables(pool);
    const email = getEmail(req.headers);
    const userRow = await getOrCreate(pool, email);
    const updated = await updateUser(pool, userRow.id, { isPremium: true });
    return res.json(rowToUser(updated));
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
  finally { await pool.end(); }
}
