import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib";

// GET /api/voice — list uploaded voice cues (returns empty, Blob not configured)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  // Voice cues require Vercel Blob — return empty map for now
  return res.json({});
}
