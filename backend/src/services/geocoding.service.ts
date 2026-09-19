// src/services/geocoding.service.ts

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Clean venue name for Nominatim — same logic jo frontend mein hai.
 */
function cleanVenueName(venue: string): string {
  // Extract city/state from parentheses
  const insideParens = venue.match(/\(([^)]+)\)/)?.[1] ?? '';

  // Remove parentheses from main name
  let mainName = venue.replace(/\([^)]*\)/g, '').trim();
  mainName = mainName
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .replace(/,+\s*$/, '');

  // Try to extract "City, ST" from parens
  const cityStateMatch = insideParens.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})\s*$/);
  const cityState = cityStateMatch ? cityStateMatch[1] : '';

  return [mainName, cityState].filter(Boolean).join(', ');
}

/**
 * Geocode via OpenStreetMap Nominatim (server-side).
 * Returns null if not found.
 */
async function tryNominatim(query: string): Promise<Coordinates | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query
    )}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PlaygroundLeague/1.0 (contact@playgroundleague.pro)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng };
  } catch (err) {
    console.error('❌ Nominatim error:', err);
    return null;
  }
}

/**
 * Geocode address → coordinates.
 * Tries cleaned name first, then main name, then original.
 */
export async function geocodeAddress(
  address: string
): Promise<Coordinates | null> {
  if (!address || address.trim().length < 3) return null;

  const cleaned = cleanVenueName(address);
  console.log('🧹 Cleaning:', address, '→', cleaned);

  // Attempt 1: Cleaned name
  let coords = await tryNominatim(cleaned);
  if (coords) return coords;

  // Attempt 2: Just main name (without city)
  const mainOnly = cleaned.split(',')[0]?.trim();
  if (mainOnly && mainOnly !== cleaned) {
    await new Promise((r) => setTimeout(r, 1100)); // rate limit
    coords = await tryNominatim(mainOnly);
    if (coords) return coords;
  }

  // Attempt 3: Original address
  if (address !== cleaned) {
    await new Promise((r) => setTimeout(r, 1100));
    coords = await tryNominatim(address);
    if (coords) return coords;
  }

  console.warn('⚠️ Geocoding failed for:', address);
  return null;
}