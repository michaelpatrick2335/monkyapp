import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserByEmail, updateUser, TEST_ACCOUNTS } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const email = ((req.body?.email as string) || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email required" });

    const found = await getUserByEmail(email);
    if (!found) return res.status(404).json({ error: "No account found with that email" });

    // Auto-upgrade test accounts
    if (TEST_ACCOUNTS.includes(email) && !found.isPremium) {
      const unlocked = await updateUser(found.id, { isPremium: true });
      return res.json(unlocked);
    }

    return res.json(found);
  } catch (e: any) {
    console.error("/api/login error:", e);
    return res.status(500).json({ error: e.message || "Login failed" });
  }
}
