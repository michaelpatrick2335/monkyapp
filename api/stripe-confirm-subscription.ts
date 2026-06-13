import type { VercelRequest, VercelResponse } from "@vercel/node";
import { makePool, ensureTables, getOrCreateUser, updateUser, getEmail, cors } from "./_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.json({ demo: true });

  const pool = makePool();
  try {
    await ensureTables(pool);
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as any });
    const { customerId, paymentMethodId } = req.body as { customerId: string; paymentMethodId: string };
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
    await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price_data: { currency: "usd", product_data: { name: "MONKy Full Access" }, unit_amount: 499, recurring: { interval: "month" } } }],
      trial_period_days: 3,
      default_payment_method: paymentMethodId,
    });
    const email = getEmail(req.headers as any);
    const userRow = await getOrCreateUser(pool, email);
    await updateUser(pool, userRow.id, { isPremium: true });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally { await pool.end(); }
}
