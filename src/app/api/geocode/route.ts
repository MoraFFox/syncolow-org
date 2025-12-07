
import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, validateEnvVars } from '@/lib/api-error-utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  try {
    validateEnvVars(
      { GOOGLE_GEOCODING_API_KEY: process.env.GOOGLE_GEOCODING_API_KEY },
      'geocode-api'
    );
  } catch (error) {
    return createErrorResponse(error, 500, { component: 'geocode-api', action: 'validate-env' });
  }

  const GOOGLE_GEOCODING_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY!;

  if (address) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_GEOCODING_API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return createSuccessResponse({
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
        });
      } else {
        return createErrorResponse(
          new Error(`Address not found: ${data.status}`),
          404,
          { component: 'geocode-api', action: 'geocode-address' }
        );
      }
    } catch (error) {
      return createErrorResponse(error, 500, { component: 'geocode-api', action: 'geocode-address' });
    }
  } else if (lat && lng) {
    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_GEOCODING_API_KEY}`
        );
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            return createSuccessResponse({
                formattedAddress: result.formatted_address,
            });
        } else {
            return createErrorResponse(
              new Error(`Location not found: ${data.status}`),
              404,
              { component: 'geocode-api', action: 'reverse-geocode' }
            );
        }
    } catch (error) {
        return createErrorResponse(error, 500, { component: 'geocode-api', action: 'reverse-geocode' });
    }
  }

  return createErrorResponse(
    new Error('Missing address or lat/lng parameters'),
    400,
    { component: 'geocode-api', action: 'validate-params' }
  );
}
