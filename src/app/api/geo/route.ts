import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const GOOGLE_GEOCODING_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!GOOGLE_GEOCODING_API_KEY) {
    return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
  }

  if (address) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_GEOCODING_API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return NextResponse.json({
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
        });
      } else {
        return NextResponse.json({ error: 'Address not found', details: data.status }, { status: 404 });
      }
    } catch (error) {
      logger.error(error, { component: 'GeoAPI', action: 'geocode', address });
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
    }
  } else if (lat && lng) {
    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_GEOCODING_API_KEY}`
        );
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            return NextResponse.json({
                formattedAddress: result.formatted_address,
            });
        } else {
            return NextResponse.json({ error: 'Location not found', details: data.status }, { status: 404 });
        }
    } catch (error) {
        logger.error(error, { component: 'GeoAPI', action: 'reverseGeocode', lat, lng });
        return NextResponse.json({ error: 'Reverse geocoding failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Missing address or lat/lng parameters' }, { status: 400 });
}
