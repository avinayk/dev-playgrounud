import React, { useState } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';

interface StateCitySelectorProps {
  selectedState: string;
  selectedCity: string;
  onStateChange: (state: string, defaultCity: string) => void;
  onCityChange: (city: string) => void;
}

// US States and major cities mapping (state abbreviation -> cities)
const stateCities: { [key: string]: string[] } = {
  AL: ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville'],
  AK: ['Anchorage', 'Fairbanks', 'Juneau'],
  AZ: ['Phoenix', 'Tucson', 'Mesa', 'Chandler'],
  AR: ['Little Rock', 'Fort Smith', 'Fayetteville'],
  CA: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose'],
  CO: ['Denver', 'Colorado Springs', 'Aurora'],
  CT: ['Bridgeport', 'New Haven', 'Hartford'],
  DE: ['Wilmington', 'Dover', 'Newark'],
  FL: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'],
  GA: ['Atlanta', 'Savannah', 'Augusta', 'Columbus'],
  HI: ['Honolulu', 'Hilo', 'Kailua'],
  ID: ['Boise', 'Meridian', 'Nampa'],
  IL: ['Chicago', 'Springfield', 'Peoria', 'Naperville'],
  IN: ['Indianapolis', 'Fort Wayne', 'Evansville'],
  IA: ['Des Moines', 'Cedar Rapids', 'Davenport'],
  KS: ['Wichita', 'Overland Park', 'Kansas City'],
  KY: ['Louisville', 'Lexington', 'Frankfort'],
  LA: ['New Orleans', 'Baton Rouge', 'Shreveport'],
  ME: ['Portland', 'Augusta', 'Bangor'],
  MD: ['Baltimore', 'Annapolis', 'Rockville'],
  MA: ['Boston', 'Worcester', 'Springfield'],
  MI: ['Detroit', 'Grand Rapids', 'Ann Arbor'],
  MN: ['Minneapolis', 'Saint Paul', 'Duluth'],
  MS: ['Jackson', 'Gulfport', 'Biloxi'],
  MO: ['St. Louis', 'Kansas City', 'Springfield'],
  MT: ['Billings', 'Missoula', 'Great Falls'],
  NE: ['Omaha', 'Lincoln', 'Bellevue'],
  NV: ['Las Vegas', 'Reno', 'Henderson'],
  NH: ['Manchester', 'Nashua', 'Concord'],
  NJ: ['Newark', 'Jersey City', 'Paterson'],
  NM: ['Albuquerque', 'Las Cruces', 'Santa Fe'],
  NY: ['New York', 'Buffalo', 'Rochester', 'Syracuse'],
  NC: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham'],
  ND: ['Fargo', 'Bismarck', 'Grand Forks'],
  OH: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo'],
  OK: ['Oklahoma City', 'Tulsa', 'Norman'],
  OR: ['Portland', 'Salem', 'Eugene'],
  PA: ['Philadelphia', 'Pittsburgh', 'Allentown'],
  RI: ['Providence', 'Warwick', 'Cranston'],
  SC: ['Columbia', 'Charleston', 'Greenville'],
  SD: ['Sioux Falls', 'Rapid City', 'Aberdeen'],
  TN: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga'],
  TX: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
  UT: ['Salt Lake City', 'Provo', 'West Valley City'],
  VT: ['Burlington', 'Montpelier', 'South Burlington'],
  VA: ['Virginia Beach', 'Richmond', 'Arlington'],
  WA: ['Seattle', 'Spokane', 'Tacoma'],
  WV: ['Charleston', 'Huntington', 'Morgantown'],
  WI: ['Milwaukee', 'Madison', 'Green Bay'],
  WY: ['Cheyenne', 'Casper', 'Laramie'],
};

// Full state names for display (abbr -> name)
export const stateNames: { [key: string]: string } = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming',
};

// Reverse: full name -> abbr
const nameToAbbr: { [key: string]: string } = Object.fromEntries(
  Object.entries(stateNames).map(([k, v]) => [v.toLowerCase(), k])
);

// Accept either "CA" or "California" and normalize to abbr
 const normalizeState = (input: string): string => {
  if (!input) return '';
  const cleaned = input.trim().toLowerCase().replace(/\./g, '');
  if (!cleaned) return '';

  // 1. Direct abbreviation match ("ca", "ny")
  const upper = cleaned.toUpperCase();
  if (stateCities[upper]) return upper;

  // 2. Exact full-name match ("california")
  if (nameToAbbr[cleaned]) return nameToAbbr[cleaned];

  // 3. Substring match against full names ("new york, usa" -> "new york")
  for (const [name, abbr] of Object.entries(nameToAbbr)) {
    if (cleaned === name) return abbr;
    if (cleaned.startsWith(name + ' ') || cleaned.endsWith(' ' + name)) {
      return abbr;
    }
    if (cleaned.includes(name)) return abbr;
  }

  // 4. Substring match against abbreviations ("ny, usa" -> "ny")
  for (const abbr of Object.keys(stateCities)) {
    const re = new RegExp(`(^|[^a-z])${abbr.toLowerCase()}([^a-z]|$)`);
    if (re.test(cleaned)) return abbr;
  }

  return '';
};

export const StateCitySelector: React.FC<StateCitySelectorProps> = ({
  selectedState,
  selectedCity,
  onStateChange,
  onCityChange,
}) => {
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const states = Object.keys(stateCities).sort();

  // Normalize incoming state (handles both "NY" and "New York")
  const stateAbbr = normalizeState(selectedState);
  const cities = stateAbbr ? stateCities[stateAbbr] || [] : [];

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAbbr = e.target.value;
    const defaultCity = stateCities[newAbbr]?.[0] || '';
    // Emit the full state name so it stays consistent with existing data
    const fullName = stateNames[newAbbr] || newAbbr;
    onStateChange(fullName, defaultCity);
  };

  // ---------- Auto-detect location ----------
const handleAutoDetect = () => {
  if (!navigator.geolocation) {
    setDetectError('Geolocation not supported by this browser.');
    return;
  }

  setDetecting(true);
  setDetectError(null);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        console.log('[Geo] coords:', latitude, longitude);

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse` +
            `?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=10`,
          { headers: { Accept: 'application/json' } }
        );

        if (!res.ok) throw new Error(`Reverse geocoding failed (${res.status})`);

        const data = await res.json();
        console.log('[Geo] nominatim raw:', data);

        const addr = data.address || {};

        // --- Collect every possible state field, then fall back to display_name ---
        const stateCandidates: string[] = [
          addr.state,
          addr.region,
          addr.state_district,
          addr.province,
          addr.county,
        ].filter(Boolean);

        // Split display_name like "Nashua, Hillsborough County, New Hampshire, United States"
        if (typeof data.display_name === 'string') {
          stateCandidates.push(
            ...data.display_name.split(',').map((s: string) => s.trim())
          );
        }

        // Try each candidate until one matches
        let abbr = '';
        let matchedFrom = '';
        for (const cand of stateCandidates) {
          const found = normalizeState(cand);
          if (found) {
            abbr = found;
            matchedFrom = cand;
            break;
          }
        }

        if (!abbr) {
          console.warn('[Geo] no state match. Candidates:', stateCandidates);
          setDetectError(
            `Couldn't identify your state (got "${stateCandidates[0] || 'unknown'}"). Please pick it manually.`
          );
          return;
        }

        console.log('[Geo] matched state:', matchedFrom, '->', abbr);

        const fullName = stateNames[abbr] || abbr;
        const cityList = stateCities[abbr] || [];

        // --- City: try every locality field Nominatim may use ---
        const cityCandidates: string[] = [
          addr.city,
          addr.town,
          addr.village,
          addr.hamlet,
          addr.suburb,
          addr.county,
        ].filter(Boolean);

        const matchedCity =
          cityList.find((c) =>
            cityCandidates.some((cc) => cc.toLowerCase() === c.toLowerCase())
          ) ||
          cityList.find((c) =>
            cityCandidates.some(
              (cc) =>
                c.toLowerCase().includes(cc.toLowerCase()) ||
                cc.toLowerCase().includes(c.toLowerCase())
            )
          ) ||
          cityList[0] ||           // fall back to first city in the list
          cityCandidates[0] ||
          '';

        console.log('[Geo] resolved city:', matchedCity);

        onStateChange(fullName, matchedCity);
        onCityChange(matchedCity);
      } catch (err: any) {
        console.error('[Geo] detect error:', err);
        setDetectError(
          err?.message?.includes('Failed to fetch')
            ? 'Network blocked the lookup. Please select manually.'
            : `Detection failed: ${err?.message || 'unknown error'}`
        );
      } finally {
        setDetecting(false);
      }
    },
    (err) => {
      console.error('[Geo] geolocation error:', err);
      const msg =
        err.code === err.PERMISSION_DENIED
          ? 'Location permission denied.'
          : err.code === err.POSITION_UNAVAILABLE
          ? 'Location unavailable. Check that location services are on.'
          : 'Could not get your location.';
      setDetectError(msg);
      setDetecting(false);
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
  );
};

  return (
    <div className="space-y-3">
      {/* ===== Auto-detect button ===== */}
      <button
        type="button"
        onClick={handleAutoDetect}
        disabled={detecting}
        className="w-full sm:w-auto px-4 py-2.5 bg-indigo-900/80 hover:bg-indigo-800 disabled:opacity-60 border-2 border-lime-400/60 hover:border-lime-400 rounded-2xl text-lime-300 text-xs font-black italic uppercase flex items-center justify-center sm:justify-start gap-2 transition shadow-lg shadow-lime-400/10"
      >
        {detecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Detecting…
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4" />
            Auto-Detect Current Location
            <MapPin className="w-4 h-4 text-red-400" />
          </>
        )}
      </button>

      {detectError && (
        <p className="text-red-300 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {detectError}
        </p>
      )}

      {/* ===== State / City dropdowns ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-indigo-200 block mb-1">
            🏛️ State 🏛️ *
          </label>
          <select
            value={stateAbbr}
            onChange={handleStateChange}
            className="w-full p-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
          >
            <option value="">Select State</option>
            {states.map((abbr) => (
              <option key={abbr} value={abbr}>
                {stateNames[abbr] || abbr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-indigo-200 block mb-1">
            📍 City / Town 🏙️ *
          </label>
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full p-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
          >
            <option value="">Select City</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default StateCitySelector;