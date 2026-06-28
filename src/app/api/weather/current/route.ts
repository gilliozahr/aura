import { NextRequest, NextResponse } from 'next/server';
import { getTripWeather } from '@/lib/server/weather';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const city = searchParams.get('city')?.trim() || 'Dubai';
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');

  const lat = latStr ? parseFloat(latStr) : undefined;
  const lon = lonStr ? parseFloat(lonStr) : undefined;

  const { weather, reason } = await getTripWeather({
    city,
    latitude: lat,
    longitude: lon,
  });

  if (!weather) {
    return NextResponse.json({
      city,
      temperatureC: 0,
      condition: 'Unavailable',
      available: false,
      timestamp: new Date().toISOString(),
      reason: reason ?? 'fetch_error',
    });
  }

  return NextResponse.json({
    ...weather,
    timestamp: new Date().toISOString(),
  });
}
