import type { VercelRequest, VercelResponse } from "@vercel/node";
import { makePool, ensureTables, rowToUser, getOrCreateUser, updateUser, getEmail, cors } from "./_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const pool = makePool();
  try {
    await ensureTables(pool);
    const { tier } = req.body as { tier: string };
    const tierMap: Record<string, number> = { newbie: 1, experienced: 250, enlightened: 500 };
    const newLevel = tierMap[tier];
    if (!newLevel) return res.status(400).json({ error: "Invalid tier" });
    const email = getEmail(req.headers as any);
    const userRow = await getOrCreateUser(pool, email);
    const updated = await updateUser(pool, userRow.id, { tier, level: newLevel });
    return res.json(rowToUser(updated));
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally { await pool.end(); }
}
