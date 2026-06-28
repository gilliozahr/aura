import { NextRequest, NextResponse } from 'next/server';

// Maps ISO alpha-2 country codes to names matching the PackingView COUNTRIES dropdown.
const CODE_TO_COUNTRY: Record<string, string> = {
  AU: 'Australia',
  AT: 'Austria',
  BH: 'Bahrain',
  BE: 'Belgium',
  BR: 'Brazil',
  BG: 'Bulgaria',
  CA: 'Canada',
  CL: 'Chile',
  CN: 'China',
  CO: 'Colombia',
  HR: 'Croatia',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DK: 'Denmark',
  EG: 'Egypt',
  ET: 'Ethiopia',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GH: 'Ghana',
  GR: 'Greece',
  HK: 'Hong Kong',
  HU: 'Hungary',
  IN: 'India',
  ID: 'Indonesia',
  IE: 'Ireland',
  IT: 'Italy',
  JP: 'Japan',
  JO: 'Jordan',
  KE: 'Kenya',
  KW: 'Kuwait',
  LB: 'Lebanon',
  MY: 'Malaysia',
  MV: 'Maldives',
  MT: 'Malta',
  MX: 'Mexico',
  MA: 'Morocco',
  NL: 'Netherlands',
  NZ: 'New Zealand',
  NG: 'Nigeria',
  NO: 'Norway',
  OM: 'Oman',
  PK: 'Pakistan',
  PE: 'Peru',
  PH: 'Philippines',
  PL: 'Poland',
  PT: 'Portugal',
  QA: 'Qatar',
  RO: 'Romania',
  RW: 'Rwanda',
  SA: 'Saudi Arabia',
  SG: 'Singapore',
  ZA: 'South Africa',
  KR: 'South Korea',
  ES: 'Spain',
  LK: 'Sri Lanka',
  SE: 'Sweden',
  CH: 'Switzerland',
  TW: 'Taiwan',
  TZ: 'Tanzania',
  TH: 'Thailand',
  TN: 'Tunisia',
  TR: 'Turkey',
  AE: 'UAE',
  UA: 'Ukraine',
  GB: 'United Kingdom',
  US: 'United States',
  VN: 'Vietnam',
};

// Small local fallback for when no API key is configured.
const CITY_FALLBACK: Record<string, { country: string; countryCode: string; latitude: number; longitude: number }> = {
  paris: { country: 'France', countryCode: 'FR', latitude: 48.8566, longitude: 2.3522 },
  dubai: { country: 'UAE', countryCode: 'AE', latitude: 25.2048, longitude: 55.2708 },
  beirut: { country: 'Lebanon', countryCode: 'LB', latitude: 33.8938, longitude: 35.5018 },
  london: { country: 'United Kingdom', countryCode: 'GB', latitude: 51.5074, longitude: -0.1278 },
  'new york': { country: 'United States', countryCode: 'US', latitude: 40.7128, longitude: -74.006 },
  rome: { country: 'Italy', countryCode: 'IT', latitude: 41.9028, longitude: 12.4964 },
  milan: { country: 'Italy', countryCode: 'IT', latitude: 45.4654, longitude: 9.1859 },
  barcelona: { country: 'Spain', countryCode: 'ES', latitude: 41.3851, longitude: 2.1734 },
  madrid: { country: 'Spain', countryCode: 'ES', latitude: 40.4168, longitude: -3.7038 },
  athens: { country: 'Greece', countryCode: 'GR', latitude: 37.9838, longitude: 23.7275 },
  istanbul: { country: 'Turkey', countryCode: 'TR', latitude: 41.0082, longitude: 28.9784 },
  riyadh: { country: 'Saudi Arabia', countryCode: 'SA', latitude: 24.7136, longitude: 46.6753 },
  doha: { country: 'Qatar', countryCode: 'QA', latitude: 25.2854, longitude: 51.531 },
  cairo: { country: 'Egypt', countryCode: 'EG', latitude: 30.0444, longitude: 31.2357 },
  zurich: { country: 'Switzerland', countryCode: 'CH', latitude: 47.3769, longitude: 8.5417 },
  berlin: { country: 'Germany', countryCode: 'DE', latitude: 52.52, longitude: 13.405 },
  amsterdam: { country: 'Netherlands', countryCode: 'NL', latitude: 52.3676, longitude: 4.9041 },
  lisbon: { country: 'Portugal', countryCode: 'PT', latitude: 38.7169, longitude: -9.1395 },
  tokyo: { country: 'Japan', countryCode: 'JP', latitude: 35.6762, longitude: 139.6503 },
  singapore: { country: 'Singapore', countryCode: 'SG', latitude: 1.3521, longitude: 103.8198 },
  sydney: { country: 'Australia', countryCode: 'AU', latitude: -33.8688, longitude: 151.2093 },
  toronto: { country: 'Canada', countryCode: 'CA', latitude: 43.6532, longitude: -79.3832 },
  'new york city': { country: 'United States', countryCode: 'US', latitude: 40.7128, longitude: -74.006 },
  nyc: { country: 'United States', countryCode: 'US', latitude: 40.7128, longitude: -74.006 },
};

interface OWMGeoResult {
  name: string;
  country: string;
  lat: number;
  lon: number;
  state?: string;
}

interface LookupSuccess {
  matched: true;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  source: 'openweather_geocoding' | 'local_fallback';
}

interface LookupFailure {
  matched: false;
  city: string;
  source: 'openweather_geocoding' | 'local_fallback' | 'no_api_key';
}

type LookupResult = LookupSuccess | LookupFailure;

export async function GET(request: NextRequest): Promise<NextResponse<LookupResult>> {
  const { searchParams } = request.nextUrl;
  const raw = searchParams.get('city')?.trim() ?? '';

  if (raw.length < 2) {
    return NextResponse.json({ matched: false, city: raw, source: 'no_api_key' });
  }

  const apiKey = process.env.WEATHER_API_KEY;

  // ── OpenWeather Geocoding ──────────────────────────────────────────────────
  if (apiKey) {
    try {
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(raw)}&limit=1&appid=${apiKey}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });

      if (res.ok) {
        const data = (await res.json()) as OWMGeoResult[];
        if (Array.isArray(data) && data.length > 0) {
          const top = data[0];
          const countryCode = top.country?.toUpperCase() ?? '';
          const country = CODE_TO_COUNTRY[countryCode] ?? null;

          if (country) {
            return NextResponse.json({
              matched: true,
              city: top.name,
              country,
              countryCode,
              latitude: top.lat,
              longitude: top.lon,
              source: 'openweather_geocoding',
            });
          }

          // Provider matched but country not in our dropdown — return no match
          console.info('[location/lookup] OWM matched but country not in dropdown', { countryCode, raw });
          return NextResponse.json({ matched: false, city: raw, source: 'openweather_geocoding' });
        }
        // Empty result array → city not found
        return NextResponse.json({ matched: false, city: raw, source: 'openweather_geocoding' });
      }

      console.warn('[location/lookup] OWM geocoding HTTP error', { status: res.status });
    } catch (err) {
      console.warn('[location/lookup] OWM geocoding fetch failed', { message: err instanceof Error ? err.message : String(err) });
    }
  }

  // ── Local fallback ────────────────────────────────────────────────────────
  const fallback = CITY_FALLBACK[raw.toLowerCase()];
  if (fallback) {
    return NextResponse.json({
      matched: true,
      city: raw,
      ...fallback,
      source: 'local_fallback',
    });
  }

  return NextResponse.json({ matched: false, city: raw, source: apiKey ? 'openweather_geocoding' : 'no_api_key' });
}
