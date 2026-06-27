import { NextRequest, NextResponse } from 'next/server';
import type { WeatherContext } from '@/lib/types';

interface OWMResponse {
  name: string;
  main: { temp: number; feels_like: number; humidity: number };
  weather: Array<{ main: string; description: string }>;
}

type FailReason =
  | 'missing_api_key'
  | 'provider_invalid_key'
  | 'provider_rate_limited'
  | 'provider_http_error'
  | 'provider_parse_error'
  | 'fetch_error';

function unavailable(city: string, reason: FailReason, extra?: Record<string, unknown>): WeatherContext & { reason: FailReason } {
  return {
    city,
    temperatureC: 0,
    condition: 'Unavailable',
    available: false,
    timestamp: new Date().toISOString(),
    reason,
    ...extra,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const city = searchParams.get('city')?.trim() || 'Dubai';
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  const apiKey = process.env.WEATHER_API_KEY;

  // Safe server-side diagnostics — never log the key value
  console.info('[weather] request', {
    city,
    lat,
    lon,
    hasApiKey: Boolean(apiKey),
    keyLength: apiKey?.length ?? 0,
  });

  if (!apiKey) {
    console.warn('[weather] WEATHER_API_KEY is not set');
    return NextResponse.json(unavailable(city, 'missing_api_key'));
  }

  const query = lat && lon
    ? `lat=${lat}&lon=${lon}`
    : `q=${encodeURIComponent(city)}`;

  let res: Response;
  try {
    res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?${query}&units=metric&appid=${apiKey}`,
      { next: { revalidate: 1800 } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[weather] fetch threw:', msg);
    return NextResponse.json(unavailable(city, 'fetch_error'));
  }

  console.info('[weather] OWM status', { status: res.status, city, lat, lon });

  if (!res.ok) {
    if (res.status === 401) {
      console.warn('[weather] OWM 401 — API key rejected');
      return NextResponse.json(unavailable(city, 'provider_invalid_key'));
    }
    if (res.status === 429) {
      console.warn('[weather] OWM 429 — rate limited');
      return NextResponse.json(unavailable(city, 'provider_rate_limited'));
    }
    console.warn(`[weather] OWM HTTP ${res.status}`);
    return NextResponse.json(unavailable(city, 'provider_http_error', { status: res.status }));
  }

  let data: OWMResponse;
  try {
    data = (await res.json()) as OWMResponse;
  } catch {
    console.error('[weather] failed to parse OWM response');
    return NextResponse.json(unavailable(city, 'provider_parse_error'));
  }

  const weather: WeatherContext = {
    city: data.name || city,
    temperatureC: Math.round(data.main.temp),
    condition: data.weather?.[0]?.main ?? 'Unknown',
    humidity: data.main.humidity,
    feelsLikeC: Math.round(data.main.feels_like),
    available: true,
    timestamp: new Date().toISOString(),
  };

  console.info('[weather] success', { city: weather.city, temperatureC: weather.temperatureC, condition: weather.condition });

  return NextResponse.json(weather);
}
