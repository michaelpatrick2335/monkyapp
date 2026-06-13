import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrCreateUser, updateUser, getCurrentEmail } from "../_db";

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
    const { customerId, paymentMethodId } = req.body as {
      customerId: string;
      paymentMethodId: string;
    };

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: "usd",
          product_data: { name: "MONKy Full Access" },
          unit_amount: 499,
          recurring: { interval: "month" },
        },
      }],
      trial_period_days: 3,
      default_payment_method: paymentMethodId,
    });

    const email = getCurrentEmail(req);
    const user = await getOrCreateUser(email);
    await updateUser(user.id, { isPremium: true });
    return res.json({ success: true });
  } catch (e: any) {
    console.error("/api/stripe/confirm-subscription error:", e);
    return res.status(500).json({ error: e.message });
  }
}
