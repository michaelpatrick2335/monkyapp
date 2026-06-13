// GET /api/voice — list uploaded voice cues
// POST /api/voice/:id is handled by api/voice/[id].ts

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { list } from "@vercel/blob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { blobs } = await list({ prefix: "voice-cues/" });
    const uploaded: Record<string, boolean> = {};
    for (const blob of blobs) {
      const parts = blob.pathname.split("/");
      const filename = parts[parts.length - 1];
      const id = filename.replace(/\.[^.]+$/, "");
      uploaded[id] = true;
    }
    return res.json(uploaded);
  } catch (e: any) {
    // If blob not configured, return empty
    return res.json({});
  }
}
