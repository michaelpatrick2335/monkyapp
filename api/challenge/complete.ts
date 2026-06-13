import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrCreateUser, updateUser, getCurrentEmail } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { bananas } = req.body as { bananas: number };
    const email = getCurrentEmail(req);
    const user = await getOrCreateUser(email);
    const bonusBananas = Math.min(Math.max(bananas, 1), 10);
    const updated = await updateUser(user.id, { bananas: user.bananas + bonusBananas });
    return res.json({ user: updated, bonusBananas });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Failed to award bananas" });
  }
}
