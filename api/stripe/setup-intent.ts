import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.json({ demo: true });

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as any });
    const { email } = req.body as { email: string };

    let customerId: string | undefined;
    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      customerId = existing.data.length > 0
        ? existing.data[0].id
        : (await stripe.customers.create({ email })).id;
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    return res.json({ clientSecret: setupIntent.client_secret, customerId });
  } catch (e: any) {
    console.error("/api/stripe/setup-intent error:", e);
    return res.status(500).json({ error: e.message });
  }
}
