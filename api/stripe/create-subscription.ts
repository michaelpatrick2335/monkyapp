import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.json({ demo: true, message: "Stripe not configured" });

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as any });
    const { email } = req.body as { email: string };
    const origin = req.headers.origin || "https://www.monkyapp.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "MONKy Full Access",
            description: "Unlimited meditations, all 1000 levels, all 25 monk ranks",
          },
          unit_amount: 499,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      subscription_data: { trial_period_days: 3 },
      success_url: `${origin}/#/?stripe=success`,
      cancel_url: `${origin}/#/`,
    });

    return res.json({ url: session.url });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
