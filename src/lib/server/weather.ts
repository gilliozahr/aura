/**
 * Server-only weather helper. Call directly from API routes — do NOT import
 * from client components. Uses WEATHER_API_KEY via process.env (server-side only).
 */

import type { TravelWeather } from '@/lib/types';

interface OWMResponse {
  name: string;
  main: { temp: number; feels_like: number; humidity: number };
  weather: Array<{ main: string; description: string }>;
}

export type WeatherFailReason =
  | 'missing_api_key'
  | 'provider_invalid_key'
  | 'provider_rate_limited'
  | 'provider_http_error'
  | 'provider_parse_error'
  | 'fetch_error';

export interface WeatherResult {
  weather: TravelWeather | null;
  reason: WeatherFailReason | null;
}

interface WeatherInput {
  city: string;
  countryCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

async function owmFetch(query: string, apiKey: string): Promise<OWMResponse | WeatherFailReason> {
  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  const params = new URLSearchParams(query);
  params.set('units', 'metric');
  params.set('appid', apiKey);
  url.search = params.toString();

  let res: Response;
  try {
    res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  } catch {
    return 'fetch_error';
  }

  if (!res.ok) {
    if (res.status === 401) return 'provider_invalid_key';
    if (res.status === 429) return 'provider_rate_limited';
    return 'provider_http_error';
  }

  try {
    return (await res.json()) as OWMResponse;
  } catch {
    return 'provider_parse_error';
  }
}

/**
 * Fetch current weather for a trip destination.
 * Priority: lat/lon → city,CC → city,country → city
 */
export async function getTripWeather(input: WeatherInput): Promise<WeatherResult> {
  const { city, countryCode, country, latitude, longitude } = input;
  const apiKey = process.env.WEATHER_API_KEY;

  console.info('[packing/weather] input', {
    city,
    country: country ?? null,
    countryCode: countryCode ?? null,
    hasLatLon: latitude !== undefined && longitude !== undefined,
    lat: latitude !== undefined ? Number(latitude.toFixed(4)) : null,
    lon: longitude !== undefined ? Number(longitude.toFixed(4)) : null,
    hasWeatherApiKey: Boolean(apiKey),
  });

  if (!apiKey) {
    console.warn('[packing/weather] WEATHER_API_KEY not set');
    return { weather: null, reason: 'missing_api_key' };
  }

  // Build query strings in priority order
  const queries: string[] = [];
  if (latitude !== undefined && longitude !== undefined) {
    queries.push(`lat=${latitude}&lon=${longitude}`);
  }
  if (countryCode) {
    queries.push(`q=${encodeURIComponent(`${city},${countryCode}`)}`);
  }
  if (country && country !== countryCode) {
    queries.push(`q=${encodeURIComponent(`${city},${country}`)}`);
  }
  queries.push(`q=${encodeURIComponent(city)}`);

  let lastReason: WeatherFailReason = 'fetch_error';

  for (const query of queries) {
    const result = await owmFetch(query, apiKey);

    if (typeof result === 'string') {
      // It's a FailReason
      lastReason = result;
      console.warn(`[packing/weather] query failed`, { query: query.replace(apiKey, '[key]'), reason: result });
      // For auth/parse errors, no point retrying with different query params
      if (result === 'provider_invalid_key' || result === 'provider_parse_error') break;
      continue;
    }

    const weather: TravelWeather = {
      city: result.name || city,
      temperatureC: Math.round(result.main.temp),
      condition: result.weather?.[0]?.main ?? 'Unknown',
      humidity: result.main.humidity,
      feelsLikeC: Math.round(result.main.feels_like),
      available: true,
      source: 'openweathermap',
    };

    console.info('[packing/weather] provider response', {
      status: 'ok',
      available: true,
      city: weather.city,
      temperatureC: weather.temperatureC,
      condition: weather.condition,
    });

    return { weather, reason: null };
  }

  console.warn('[packing/weather] provider response', {
    status: 'unavailable',
    available: false,
    reason: lastReason,
  });

  return { weather: null, reason: lastReason };
}
