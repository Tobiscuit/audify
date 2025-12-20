import Stripe from 'stripe';

// Lazy initialization - only create client when first used (at runtime, not build time)
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// Credit package definitions
export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 100_000,
    priceCents: 500, // $5.00
    description: 'Perfect for trying out Audify',
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 350_000,
    priceCents: 1500, // $15.00
    description: 'For regular content creators',
  },
  {
    id: 'studio',
    name: 'Studio',
    credits: 1_000_000,
    priceCents: 4000, // $40.00
    description: 'Best value for power users',
  },
] as const;

export type CreditPackageId = typeof CREDIT_PACKAGES[number]['id'];

export function getPackageById(id: string) {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === id);
}
