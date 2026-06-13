import type { VercelRequest, VercelResponse } from "@vercel/node";
import { makePool, ensureTables, getOrCreateUser, rowToUser, getEmail, cors } from "../_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const pool = makePool();
  try {
    await ensureTables(pool);
    const email = getEmail(req.headers as any);
    const userRow = await getOrCreateUser(pool, email);
    const user = rowToUser(userRow);
    if (!user.profilePic) return res.status(404).json({ error: "No profile pic" });
    res.setHeader("Location", user.profilePic);
    return res.status(302).end();
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally { await pool.end(); }
}
