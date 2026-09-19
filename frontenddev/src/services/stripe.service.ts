// services/stripe.service.ts
const API_URL =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

export async function createCheckoutSession(
  athleteId: string,
  email?: string
): Promise<{ url: string; sessionId: string }> {
  const res = await fetch(`${API_URL}/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId, email }),
  });
  const json = await res.json();
  if (!res.ok || !json.success || !json.url) {
    throw new Error(json.message || 'Failed to create Stripe checkout');
  }
  return { url: json.url, sessionId: json.sessionId };
}

export async function verifyStripeSession(sessionId: string) {
  const res = await fetch(`${API_URL}/stripe/session/${sessionId}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Session verify failed');
  return json as {
    success: boolean;
    upgraded: boolean;
    athlete?: any;
    paymentStatus?: string;
  };
}
/* ⭐⭐ NEW: Billing Portal session */
export async function createBillingPortalSession(
  athleteId: string
): Promise<{ url: string }> {
  const res = await fetch(`${API_URL}/stripe/create-billing-portal-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success || !json.url) {
    throw new Error(json.message || 'Failed to open billing portal');
  }
  return { url: json.url };
}

/* ⭐⭐ NEW: Fetch subscription status (optional, for real-time sync) */
export async function fetchSubscriptionStatus(athleteId: string) {
  const res = await fetch(`${API_URL}/stripe/subscription-status/${athleteId}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch');
  return json as {
    success: boolean;
    isPro: boolean;
    subscription: {
      id: string;
      status: string;
      currentPeriodEnd: number;
      cancelAtPeriodEnd: boolean;
      priceId: string;
      amount: number;
      currency: string;
    } | null;
    paymentMethods: Array<{
      id: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    }>;
  };
}
export async function cancelProSubscription(athleteId: string) {
  const res = await fetch(`${API_URL}/stripe/cancel-subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Cancel failed');
  return json;
}