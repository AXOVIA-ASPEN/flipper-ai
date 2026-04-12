// Story 5.5: Geoapify-based distance calculation for local-pickup-only items
// Uses geocoding to convert locations to coordinates, then Haversine for distance

export interface DistanceResult {
  distanceMiles: number;
  fromLocation: string;
  toLocation: string;
  calculationMethod: 'geoapify';
}

// In-memory cache for geocoded coordinates
const geocodeCache = new Map<string, { lat: number; lon: number }>();

function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeLocation(
  location: string,
  apiKey: string
): Promise<{ lat: number; lon: number } | null> {
  // Check cache first
  const cacheKey = location.toLowerCase().trim();
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(location)}&apiKey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Geoapify geocoding failed (${response.status}) for "${location}"`);
      return null;
    }

    const data = await response.json();
    const feature = data?.features?.[0];
    if (!feature?.geometry?.coordinates) {
      console.warn(`No geocoding results for "${location}"`);
      return null;
    }

    const [lon, lat] = feature.geometry.coordinates;
    const result = { lat, lon };

    // Cache the result
    geocodeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn(`Geoapify geocoding error for "${location}":`, error);
    return null;
  }
}

export async function calculateDistance(
  fromLocation: string,
  toLocation: string
): Promise<DistanceResult | null> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    console.warn('GEOAPIFY_API_KEY not set, skipping distance calculation');
    return null;
  }

  try {
    const fromCoords = await geocodeLocation(fromLocation, apiKey);
    const toCoords = await geocodeLocation(toLocation, apiKey);

    if (!fromCoords || !toCoords) {
      return null;
    }

    const distanceMiles = haversineDistanceMiles(
      fromCoords.lat,
      fromCoords.lon,
      toCoords.lat,
      toCoords.lon
    );

    return {
      distanceMiles: Math.round(distanceMiles * 10) / 10,
      fromLocation,
      toLocation,
      calculationMethod: 'geoapify',
    };
  } catch (error) /* istanbul ignore next -- outer catch is defensive; geocodeLocation handles all errors internally */ {
    console.warn('Distance calculation error:', error);
    return null;
  }
}

// Export for testing — allows clearing the geocode cache
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}
