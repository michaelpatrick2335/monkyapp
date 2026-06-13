import type { VercelRequest, VercelResponse } from "@vercel/node";
import { makePool, ensureTables, rowToUser, updateUser, TEST_ACCOUNTS, cors } from "./_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const pool = makePool();
  try {
    await ensureTables(pool);
    const email = ((req.body?.email as string) || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email required" });

    const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (r.rows.length === 0) return res.status(404).json({ error: "No account found with that email" });

    let user = r.rows[0];
    if (TEST_ACCOUNTS.includes(email) && !user.is_premium) {
      const upd = await updateUser(pool, user.id, { isPremium: true });
      user = upd;
      return res.json(rowToUser(user));
    }
    return res.json(rowToUser(user));
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally {
    await pool.end();
  }
}
