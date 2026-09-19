// utils/xp.ts
const API_URL = import.meta.env.VITE_API_URL || '';

export async function awardXp(
  userId: string,
  amount: number,
  reason: string
): Promise<{ valuexp: number }> {
const res = await fetch(`${API_URL}/athletes/${userId}/xp`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, reason }),
  });

  const text = await res.text();
  if (!text) {
    throw new Error(`XP update failed (${res.status}): empty response`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`XP update: invalid JSON — ${text.slice(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `XP update failed: ${res.status}`);
  }

  return data; // expect { valuexp: <new total> }
}