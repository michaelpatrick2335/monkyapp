import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrCreateUser, updateUser, getCurrentEmail } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const email = getCurrentEmail(req);
    const user = await getOrCreateUser(email);
    const updated = await updateUser(user.id, { activeMusicTrack: req.body.id ?? null });
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
