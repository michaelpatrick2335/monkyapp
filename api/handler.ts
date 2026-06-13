// Single API router for all MONKy endpoints
// Consolidates everything into one Vercel function to stay within the 12-function limit

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";
// Stripe is loaded dynamically per-request to avoid bundling issues
// Using require() at module level - Vercel bundles this fine at runtime

// ── DB helpers ──────────────────────────────────────────────────────────────

const TEST_ACCOUNTS = ["mdore06@gmail.com", "michaelpatrick2335@gmail.com", "appreview@monkyapp.com"];

function makePool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
  });
}

async function ensureTables(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, email TEXT UNIQUE,
      name TEXT NOT NULL DEFAULT 'Seeker', tier TEXT NOT NULL DEFAULT 'newbie',
      level INTEGER NOT NULL DEFAULT 1, bananas INTEGER NOT NULL DEFAULT 0,
      total_sessions INTEGER NOT NULL DEFAULT 0, total_seconds_meditated INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0, last_session_date TEXT,
      is_premium BOOLEAN NOT NULL DEFAULT FALSE, free_sessions_used INTEGER NOT NULL DEFAULT 0,
      profile_pic TEXT, active_music_track TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS meditation_sessions (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, level INTEGER NOT NULL,
      tier TEXT NOT NULL, duration_seconds INTEGER NOT NULL, completed_at TEXT NOT NULL,
      bananas_earned INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, level INTEGER NOT NULL,
      tier TEXT NOT NULL, entry TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
}

function rowToUser(row: any) {
  return {
    id: row.id, email: row.email ?? null, name: row.name, tier: row.tier,
    level: row.level, bananas: row.bananas, totalSessions: row.total_sessions,
    totalSecondsMediated: row.total_seconds_meditated, streakDays: row.streak_days,
    lastSessionDate: row.last_session_date ?? null, isPremium: row.is_premium,
    freeSessionsUsed: row.free_sessions_used, profilePic: row.profile_pic ?? null,
    activeMusicTrack: row.active_music_track ?? null,
  };
}

function getEmail(req: VercelRequest): string | null {
  const raw = req.headers["x-user-email"];
  const val = Array.isArray(raw) ? raw[0] : raw;
  return val ? val.trim().toLowerCase() : null;
}

async function getOrCreate(pool: Pool, email: string | null) {
  if (email) {
    const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (r.rows.length > 0) {
      const u = r.rows[0];
      if (TEST_ACCOUNTS.includes(email) && !u.is_premium) {
        const upd = await pool.query("UPDATE users SET is_premium = TRUE WHERE id = $1 RETURNING *", [u.id]);
        return upd.rows[0];
      }
      return u;
    }
    const isPremium = TEST_ACCOUNTS.includes(email);
    const r2 = await pool.query(
      `INSERT INTO users (email, is_premium) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET email=EXCLUDED.email RETURNING *`,
      [email, isPremium]
    );
    return r2.rows[0];
  }
  const r = await pool.query("SELECT * FROM users WHERE email IS NULL ORDER BY id LIMIT 1");
  if (r.rows.length > 0) return r.rows[0];
  const r2 = await pool.query("INSERT INTO users DEFAULT VALUES RETURNING *");
  return r2.rows[0];
}

const COL_MAP: Record<string, string> = {
  name: "name", tier: "tier", level: "level", bananas: "bananas",
  totalSessions: "total_sessions", totalSecondsMediated: "total_seconds_meditated",
  streakDays: "streak_days", lastSessionDate: "last_session_date",
  isPremium: "is_premium", freeSessionsUsed: "free_sessions_used",
  profilePic: "profile_pic", activeMusicTrack: "active_music_track", email: "email",
};

async function updateUser(pool: Pool, id: number, fields: Record<string, any>) {
  const sets: string[] = []; const vals: any[] = []; let idx = 1;
  for (const [k, v] of Object.entries(fields)) {
    if (COL_MAP[k]) { sets.push(`${COL_MAP[k]} = $${idx++}`); vals.push(v); }
  }
  if (!sets.length) { const r = await pool.query("SELECT * FROM users WHERE id = $1", [id]); return r.rows[0]; }
  vals.push(id);
  const r = await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`, vals);
  return r.rows[0];
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Route based on query param (Vercel passes path as ?path=...)
  // In Vercel, /api/[...slug] would be req.query.slug
  // Since this is api/index.ts, the URL path after /api/ needs routing
  const url = req.url || "";
  const path = url.split("?")[0].replace(/^\/api/, "");
  const method = req.method || "GET";

  const pool = makePool();
  try {
    await ensureTables(pool);
    const email = getEmail(req);

    // ── GET /api/user ────────────────────────────────────────────────────────
    if (path === "/user" || path === "" || path === "/") {
      if (method !== "GET" && method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });
      if (method === "GET") {
        const row = await getOrCreate(pool, email);
        return res.json(rowToUser(row));
      }
      if (method === "PATCH") {
        const row = await getOrCreate(pool, email);
        const updated = await updateUser(pool, row.id, req.body);
        return res.json(rowToUser(updated));
      }
    }

    // ── POST /api/login ──────────────────────────────────────────────────────
    if (path === "/login") {
      if (method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const loginEmail = ((req.body?.email as string) || "").trim().toLowerCase();
      if (!loginEmail) return res.status(400).json({ error: "Email required" });
      const r = await pool.query("SELECT * FROM users WHERE email = $1", [loginEmail]);
      if (r.rows.length === 0) return res.status(404).json({ error: "No account found with that email" });
      let user = r.rows[0];
      if (TEST_ACCOUNTS.includes(loginEmail) && !user.is_premium) {
        const upd = await pool.query("UPDATE users SET is_premium = TRUE WHERE id = $1 RETURNING *", [user.id]);
        user = upd.rows[0];
      }
      return res.json(rowToUser(user));
    }

    // ── POST /api/unlock ─────────────────────────────────────────────────────
    if (path === "/unlock") {
      if (method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      // Accept email from body (post-Stripe flow) or header
      const bodyEmail = (req.body as any)?.email as string | undefined;
      const bodyName = (req.body as any)?.name as string | undefined;
      const unlockEmail = bodyEmail?.trim().toLowerCase() || email;
      if (!unlockEmail) return res.status(400).json({ error: "Email required" });
      const row = await getOrCreate(pool, unlockEmail);
      const updates: Record<string, any> = { isPremium: true };
      if (bodyName) updates.name = bodyName;
      const updated = await updateUser(pool, row.id, updates);
      return res.json(rowToUser(updated));
    }

    // ── POST /api/logout ─────────────────────────────────────────────────────
    if (path === "/logout") {
      if (method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const row = await getOrCreate(pool, email);
      const reset = await updateUser(pool, row.id, {
        name: "Seeker", tier: "newbie", level: 1, bananas: 0,
        totalSessions: 0, totalSecondsMediated: 0, streakDays: 0,
        lastSessionDate: null, isPremium: false, freeSessionsUsed: 0,
      });
      return res.json(rowToUser(reset));
    }

    // ── POST /api/session-complete ───────────────────────────────────────────
    if (path === "/session-complete" || path === "/session/complete") {
      if (method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const { durationSeconds } = req.body as { durationSeconds: number };
      const row = await getOrCreate(pool, email);
      const user = rowToUser(row);
      const sRes = await pool.query(
        `INSERT INTO meditation_sessions (user_id,level,tier,duration_seconds,completed_at,bananas_earned) VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [user.id, user.level, user.tier, durationSeconds, new Date().toISOString()]
      );
      const today = new Date().toISOString().split("T")[0];
      const wasYesterday = user.lastSessionDate === new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const isToday = user.lastSessionDate === today;
      const newBananas = user.bananas + 1;
      const newLevel = Math.min(user.level + 1, 1000);
      const newStreak = isToday ? user.streakDays : wasYesterday ? user.streakDays + 1 : 1;
      let newTier = user.tier;
      if (newLevel >= 500) newTier = "enlightened"; else if (newLevel >= 250) newTier = "experienced";
      const newFreeUsed = user.isPremium ? user.freeSessionsUsed : Math.min(user.freeSessionsUsed + 1, 3);
      const updatedRow = await updateUser(pool, user.id, {
        level: newLevel, bananas: newBananas, totalSessions: user.totalSessions + 1,
        totalSecondsMediated: user.totalSecondsMediated + durationSeconds,
        streakDays: newStreak, lastSessionDate: today, tier: newTier, freeSessionsUsed: newFreeUsed,
      });
      return res.json({ session: sRes.rows[0], user: rowToUser(updatedRow), leveledUp: newLevel !== user.level, newLevel });
    }

    // ── POST /api/challenge-complete ─────────────────────────────────────────
    if (path === "/challenge-complete" || path === "/challenge/complete") {
      if (method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const { bananas } = req.body as { bananas: number };
      const row = await getOrCreate(pool, email);
      const user = rowToUser(row);
      const bonus = Math.min(Math.max(bananas, 1), 10);
      const updated = await updateUser(pool, user.id, { bananas: user.bananas + bonus });
      return res.json({ user: rowToUser(updated), bonusBananas: bonus });
    }

    // ── POST /api/change-level ───────────────────────────────────────────────
    if (path === "/change-level") {
      if (method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const { tier } = req.body as { tier: string };
      const levelMap: Record<string, number> = { newbie: 1, experienced: 250, enlightened: 500 };
      const newLevel = levelMap[tier];
      if (!newLevel) return res.status(400).json({ error: "Invalid tier" });
      const row = await getOrCreate(pool, email);
      const updated = await updateUser(pool, row.id, { tier, level: newLevel });
      return res.json(rowToUser(updated));
    }

    // ── GET /api/sessions ────────────────────────────────────────────────────
    // POST /api/journal — save a journal entry for the current level
    if (path === "/journal" && method === "POST") {
      const { entry, level, tier } = req.body as { entry: string; level?: number; tier?: string };
      const cleaned = (entry || "").trim();
      if (!cleaned) return res.status(400).json({ error: "Entry is required" });
      if (cleaned.length > 500) return res.status(400).json({ error: "Entry too long (max 500 chars)" });
      const u0 = await getOrCreate(pool, email);
      const user0 = rowToUser(u0);
      const jr = await pool.query(
        `INSERT INTO journal_entries (user_id, level, tier, entry, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [user0.id, level ?? user0.level, tier ?? user0.tier, cleaned, new Date().toISOString()]
      );
      const j0 = jr.rows[0];
      return res.json({
        entry: { id: j0.id, userId: j0.user_id, level: j0.level, tier: j0.tier, entry: j0.entry, createdAt: j0.created_at }
      });
    }

    // GET /api/journal — list journal entries (newest first)
    if (path === "/journal" && method === "GET") {
      const u1 = await getOrCreate(pool, email);
      const jr2 = await pool.query(
        "SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC", [u1.id]
      );
      return res.json(jr2.rows.map((j: any) => ({
        id: j.id, userId: j.user_id, level: j.level, tier: j.tier,
        entry: j.entry, createdAt: j.created_at,
      })));
    }

    if (path === "/sessions") {
      if (method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      const row = await getOrCreate(pool, email);
      const r = await pool.query(
        "SELECT * FROM meditation_sessions WHERE user_id = $1 ORDER BY completed_at DESC", [row.id]
      );
      return res.json(r.rows.map((s: any) => ({
        id: s.id, userId: s.user_id, level: s.level, tier: s.tier,
        durationSeconds: s.duration_seconds, completedAt: s.completed_at, bananasEarned: s.bananas_earned,
      })));
    }

    // ── GET /api/music ───────────────────────────────────────────────────────
    if (path === "/music") {
      if (method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      const row = await getOrCreate(pool, email);
      return res.json({ tracks: [], active: rowToUser(row).activeMusicTrack });
    }

    // ── POST /api/music-active ───────────────────────────────────────────────
    if (path === "/music-active" || path === "/music/active") {
      if (method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const row = await getOrCreate(pool, email);
      const updated = await updateUser(pool, row.id, { activeMusicTrack: req.body?.id ?? null });
      return res.json(rowToUser(updated));
    }

    // ── GET /api/voice ───────────────────────────────────────────────────────
    if (path === "/voice") {
      return res.json({});
    }

    // ── Stripe ───────────────────────────────────────────────────────────────
    if (path === "/stripe-setup-intent" || path === "/stripe/setup-intent") {
      if (method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.json({ demo: true });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const StripeLib = require("stripe");
      const stripe = new StripeLib(stripeKey, { apiVersion: "2024-06-20" });
      const { email: stripeEmail } = req.body as { email: string };
      let customerId: string | undefined;
      if (stripeEmail) {
        const existing = await stripe.customers.list({ email: stripeEmail, limit: 1 });
        customerId = existing.data.length > 0
          ? existing.data[0].id
          : (await stripe.customers.create({ email: stripeEmail })).id;
      }
      const si = await stripe.setupIntents.create({ customer: customerId, payment_method_types: ["card"], usage: "off_session" });
      return res.json({ clientSecret: si.client_secret, customerId });
    }

    if (path === "/stripe-confirm-subscription" || path === "/stripe/confirm-subscription") {
      if (method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.json({ demo: true });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const StripeLib = require("stripe");
      const stripe = new StripeLib(stripeKey, { apiVersion: "2024-06-20" });
      const { customerId, paymentMethodId } = req.body as { customerId: string; paymentMethodId: string };
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
      await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price_data: { currency: "usd", product_data: { name: "MONKy Full Access" }, unit_amount: 499, recurring: { interval: "month" } } }],
        trial_period_days: 3, default_payment_method: paymentMethodId,
      });
      const row = await getOrCreate(pool, email);
      await updateUser(pool, row.id, { isPremium: true });
      return res.json({ success: true });
    }

    if (path === "/stripe-create-subscription" || path === "/stripe/create-subscription") {
      if (method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.json({ demo: true });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const StripeLib = require("stripe");
      const stripe = new StripeLib(stripeKey, { apiVersion: "2024-06-20" });
      const { email: stripeEmail } = req.body as { email: string };
      const origin = (req.headers.origin as string) || "https://www.monkyapp.com";
      const session = await stripe.checkout.sessions.create({
        mode: "subscription", payment_method_types: ["card"], customer_email: stripeEmail || undefined,
        line_items: [{ price_data: { currency: "usd", product_data: { name: "MONKy Full Access" }, unit_amount: 499, recurring: { interval: "month" } }, quantity: 1 }],
        subscription_data: { trial_period_days: 3 },
        success_url: `${origin}/app/#/?stripe=success`, cancel_url: `${origin}/app/#/`,
      });
      return res.json({ url: session.url });
    }

    // ── 404 ──────────────────────────────────────────────────────────────────
    return res.status(404).json({ error: "Route not found", path, method });

  } catch (e: any) {
    console.error("API error:", path, e.message);
    return res.status(500).json({ error: e.message });
  } finally {
    await pool.end().catch(() => {});
  }
}
