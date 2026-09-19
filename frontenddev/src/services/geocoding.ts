// services/geocoding.ts
export interface Coordinates {
  lat: number;
  lng: number;
}

/** Clean venue name for Nominatim */
function cleanVenueName(venue: string): string {
  const insideParens = venue.match(/\(([^)]+)\)/)?.[1] ?? '';
  let mainName = venue.replace(/\([^)]*\)/g, '').trim();
  mainName = mainName.replace(/["']/g, '').replace(/\s+/g, ' ').replace(/,+\s*$/, '');
  const cityStateMatch = insideParens.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})\s*$/);
  const cityState = cityStateMatch ? cityStateMatch[1] : '';
  return [mainName, cityState].filter(Boolean).join(', ');
}

async function tryNominatim(query: string): Promise<Coordinates | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    console.log('🌐 Nominatim query:', query);

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PlaygroundLeague/1.0 (contact@playgroundleague.pro)',
      },
    });

    console.log('📥 Nominatim status:', res.status);

    if (!res.ok) {
      console.warn('❌ Nominatim HTTP error:', res.status);
      return null;
    }

    const data = await res.json();
    console.log('📥 Nominatim results:', data);

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng };
  } catch (err) {
    console.error('❌ Nominatim fetch error:', err);
    return null;
  }
}

export async function geocodeAddress(venue: string): Promise<Coordinates | null> {
  if (!venue || venue.trim().length < 3) return null;

  const cleaned = cleanVenueName(venue);
  console.log('🧹 Cleaned venue:', cleaned);

  // Attempt 1: Cleaned name
  let coords = await tryNominatim(cleaned);
  if (coords) return coords;

  // Attempt 2: Just the main name (without city)
  const mainOnly = cleaned.split(',')[0];
  if (mainOnly && mainOnly !== cleaned) {
    await new Promise((r) => setTimeout(r, 1100));   // rate limit
    coords = await tryNominatim(mainOnly);
    if (coords) return coords;
  }

  // Attempt 3: Original full name (fallback)
  if (venue !== cleaned) {
    await new Promise((r) => setTimeout(r, 1100));
    coords = await tryNominatim(venue);
    if (coords) return coords;
  }

  console.warn('⚠️ Geocoding failed for:', venue);
  return null;
}