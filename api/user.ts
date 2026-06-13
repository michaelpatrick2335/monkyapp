import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrCreateUser, updateUser, getCurrentEmail } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const email = getCurrentEmail(req);

    if (req.method === "GET") {
      const user = await getOrCreateUser(email);
      return res.json(user);
    }

    if (req.method === "PATCH") {
      const user = await getOrCreateUser(email);
      const updated = await updateUser(user.id, req.body);
      return res.json(updated);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/user error:", e);
    return res.status(500).json({ error: e.message || "Internal server error" });
  }
}
