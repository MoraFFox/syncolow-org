
import { LatLngTuple } from "leaflet";

class GeocodeService {
    private geocodeCache: Map<string, LatLngTuple> = new Map();
    private reverseGeocodeCache: Map<string, string> = new Map();

    async geocode(address: string): Promise<LatLngTuple | null> {
        if (this.geocodeCache.has(address)) {
            return this.geocodeCache.get(address) || null;
        }

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
            if (!response.ok) {
                console.warn(`Geocoding API request for "${address}" failed with status: ${response.status}. This can happen due to rate limiting. The map marker may not appear.`);
                return null;
            }
            const data = await response.json();
            if (data && data.length > 0) {
                const coords: LatLngTuple = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                this.geocodeCache.set(address, coords);
                return coords;
            }
            return null;
        } catch (error) {
            console.warn(`A network error occurred during geocoding for address "${address}". The map marker may not appear.`, error);
            return null;
        }
    }

    async reverseGeocode(lat: number, lon: number): Promise<string | null> {
        const cacheKey = `${lat},${lon}`;
        if (this.reverseGeocodeCache.has(cacheKey)) {
            return this.reverseGeocodeCache.get(cacheKey) || null;
        }

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
             if (!response.ok) {
                console.warn(`Reverse geocoding API request for "${lat},${lon}" failed with status: ${response.status}. The address may not be updated.`);
                return null;
            }
            const data = await response.json();
             if (data && data.display_name) {
                const address = data.display_name;
                this.reverseGeocodeCache.set(cacheKey, address);
                return address;
            }
            return null;
        } catch(error) {
            console.warn(`A network error occurred during reverse geocoding for "${lat},${lon}". The address may not be updated.`, error);
            return null;
        }
    }
}

// Export a singleton instance of the service
export const geocodeService = new GeocodeService();
