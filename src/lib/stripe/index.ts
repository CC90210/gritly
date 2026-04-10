import Stripe from "stripe";

// Lazy singleton — avoids build-time failure when STRIPE_SECRET_KEY is absent.
// Call getStripe() inside route handlers, never at module scope.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}
