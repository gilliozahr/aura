import { NextRequest, NextResponse } from 'next/server';
import type { WeatherContext } from '@/lib/types';

interface OWMResponse {
  name: string;
  main: { temp: number; feels_like: number; humidity: number };
  weather: Array<{ main: string; description: string }>;
}

function fallback(city: string): WeatherContext {
  return {
    city,
    temperatureC: 0,
    condition: 'Unavailable',
    available: false,
    timestamp: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const city = searchParams.get('city')?.trim() || 'Dubai';
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallback(city));
  }

  const query = lat && lon
    ? `lat=${lat}&lon=${lon}`
    : `q=${encodeURIComponent(city)}`;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?${query}&units=metric&appid=${apiKey}`,
      { next: { revalidate: 1800 } } // cache 30 min
    );

    if (!res.ok) {
      console.warn(`[weather] OWM HTTP ${res.status} for "${city}"`);
      return NextResponse.json(fallback(city));
    }

    const data = (await res.json()) as OWMResponse;
    const weather: WeatherContext = {
      city: data.name || city,
      temperatureC: Math.round(data.main.temp),
      condition: data.weather?.[0]?.main ?? 'Unknown',
      humidity: data.main.humidity,
      feelsLikeC: Math.round(data.main.feels_like),
      available: true,
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(weather);
  } catch (err) {
    console.error('[weather] fetch error:', err instanceof Error ? err.message : err);
    return NextResponse.json(fallback(city));
  }
}
