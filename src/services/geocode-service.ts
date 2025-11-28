import { LatLngTuple } from "leaflet";

class GeocodeService {
    private geocodeCache: Map<string, LatLngTuple> = new Map();
    private reverseGeocodeCache: Map<string, string> = new Map();

    async geocode(address: string): Promise<LatLngTuple | null> {
        if (this.geocodeCache.has(address)) {
            return this.geocodeCache.get(address) || null;
        }

        try {
            const response = await fetch(`/api/geo?address=${encodeURIComponent(address)}`);
            if (!response.ok) {
                console.warn(`Geocoding API request for "${address}" failed with status: ${response.status}.`);
                return null;
            }
            const data = await response.json();
            if (data && data.lat && data.lng) {
                const coords: LatLngTuple = [data.lat, data.lng];
                this.geocodeCache.set(address, coords);
                return coords;
            }
            return null;
        } catch (error) {
            console.warn(`A network error occurred during geocoding for address "${address}".`, error);
            return null;
        }
    }

    async reverseGeocode(lat: number, lon: number): Promise<string | null> {
        const cacheKey = `${lat},${lon}`;
        if (this.reverseGeocodeCache.has(cacheKey)) {
            return this.reverseGeocodeCache.get(cacheKey) || null;
        }

        try {
            const response = await fetch(`/api/geo?lat=${lat}&lng=${lon}`);
             if (!response.ok) {
                console.warn(`Reverse geocoding API request for "${lat},${lon}" failed with status: ${response.status}.`);
                return null;
            }
            const data = await response.json();
             if (data && data.formattedAddress) {
                const address = data.formattedAddress;
                this.reverseGeocodeCache.set(cacheKey, address);
                return address;
            }
            return null;
        } catch(error) {
            console.warn(`A network error occurred during reverse geocoding for "${lat},${lon}".`, error);
            return null;
        }
    }
}

// Export a singleton instance of the service
export const geocodeService = new GeocodeService();
