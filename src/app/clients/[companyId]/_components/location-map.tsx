
"use client";

import { useMemo, useState } from 'react';
import type { Company } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { geocodeService } from '@/services/geocode-service';
import { useAsync } from 'react-use';
import { LatLngTuple } from 'leaflet';
import { GoogleMapWrapper, Marker, InfoWindow } from '@/components/ui/google-map-wrapper';

interface LocationMapProps {
  company: Company;
  branches: (Company & { isBranch: true })[];
}

interface LocationWithCoords {
    name: string;
    address: string;
    coords: LatLngTuple | null;
}

interface MapMarkerData {
    position: google.maps.LatLngLiteral;
    content: string;
}

export function LocationMap({ company, branches }: LocationMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(null);

  const { value: locations, loading, error } = useAsync(async (): Promise<LocationWithCoords[]> => {
    const locationsToGeocode: { name: string, address: string }[] = [];
    if(company.location) {
        locationsToGeocode.push({ name: `${company.name} (HQ)`, address: company.location });
    }
    branches.forEach(b => {
        if (b.location) {
            locationsToGeocode.push({ name: b.name, address: b.location });
        }
    });

    const geocoded = await Promise.all(
        locationsToGeocode.map(async loc => {
            const coords = await geocodeService.geocode(loc.address);
            return { ...loc, coords };
        })
    );

    return geocoded;
  }, [company, branches]);


  const markers: MapMarkerData[] = useMemo(() => {
    if (!locations) return [];
    return locations
        .filter((loc): loc is LocationWithCoords & { coords: LatLngTuple } => loc.coords !== null)
        .map(loc => ({
            position: { lat: loc.coords[0], lng: loc.coords[1] },
            content: `<strong>${loc.name}</strong><br/>${loc.address}`
        }));
  }, [locations]);

  const center: google.maps.LatLngLiteral = markers.length > 0 ? markers[0].position : { lat: 30.0444, lng: 31.2357 };
  const zoom = markers.length > 1 ? 5 : 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geospatial Footprint
        </CardTitle>
        <CardDescription>All company and branch locations.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full rounded-md overflow-hidden border">
           {loading && <Skeleton className="h-full w-full" />}
           {!loading && error && <div className="flex items-center justify-center h-full text-destructive">Error loading map data.</div>}
           {!loading && !error && markers.length > 0 && (
             <GoogleMapWrapper className="h-full w-full" center={center} zoom={zoom}>
               {markers.map((marker, index) => (
                 <Marker 
                    key={index} 
                    position={marker.position} 
                    onClick={() => setSelectedMarker(marker)}
                 />
               ))}
               {selectedMarker && (
                 <InfoWindow 
                    position={selectedMarker.position} 
                    onCloseClick={() => setSelectedMarker(null)}
                 >
                   <div dangerouslySetInnerHTML={{ __html: selectedMarker.content }} />
                 </InfoWindow>
               )}
             </GoogleMapWrapper>
           )}
           {!loading && !error && markers.length === 0 && (
             <div className="flex items-center justify-center h-full text-muted-foreground">No locations with valid addresses found.</div>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
