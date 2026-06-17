import { loadStripe, type Stripe } from '@stripe/stripe-js';

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

/** Singleton Stripe.js promise, loaded once with the publishable key. */
export const stripePromise: Promise<Stripe | null> = key
  ? loadStripe(key)
  : Promise.resolve(null);
