import type { VercelRequest, VercelResponse } from "@vercel/node";
import { makePool, ensureTables, getOrCreateUser, getEmail, cors } from "../_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const pool = makePool();
  try {
    await ensureTables(pool);
    const email = getEmail(req.headers as any);
    const userRow = await getOrCreateUser(pool, email);
    const r = await pool.query(
      "SELECT * FROM meditation_sessions WHERE user_id = $1 ORDER BY completed_at DESC",
      [userRow.id]
    );
    return res.json(r.rows.map((row: any) => ({
      id: row.id, userId: row.user_id, level: row.level, tier: row.tier,
      durationSeconds: row.duration_seconds, completedAt: row.completed_at,
      bananasEarned: row.bananas_earned,
    })));
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally { await pool.end(); }
}
