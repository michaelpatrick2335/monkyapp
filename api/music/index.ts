import type { VercelRequest, VercelResponse } from "@vercel/node";
import { rowToUser, getOrCreateUser, getEmail, makePool, ensureTables, cors } from "../_lib";

// GET  /api/music  — list tracks + active
// POST /api/music  — not supported (use /api/music/upload)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const pool = makePool();
    try {
      await ensureTables(pool);
      const email = getEmail(req.headers as any);
      const userRow = await getOrCreateUser(pool, email);
      const user = rowToUser(userRow);
      // No custom tracks in Vercel version (blob not configured) — return empty with active
      return res.json({ tracks: [], active: user.activeMusicTrack ?? null });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    } finally { await pool.end(); }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
