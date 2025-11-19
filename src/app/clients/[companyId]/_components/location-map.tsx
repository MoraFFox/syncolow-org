
"use client";

import { useMemo, useRef, useEffect } from 'react';
import type { Company } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { geocodeService } from '@/services/geocode-service';
import { useAsync } from 'react-use';
import { LatLngTuple } from 'leaflet';
import { Map } from '@/components/ui/map';
import { ChangeView, MapTileLayer, MapMarkers, MapMarkerProps } from '@/components/ui/map-client';


interface LocationMapProps {
  company: Company;
  branches: (Company & { isBranch: true })[];
}

interface LocationWithCoords {
    name: string;
    address: string;
    coords: LatLngTuple | null;
}

export function LocationMap({ company, branches }: LocationMapProps) {

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


  const markers: MapMarkerProps[] = useMemo(() => {
    if (!locations) return [];
    return locations
        .filter((loc): loc is LocationWithCoords & { coords: LatLngTuple } => loc.coords !== null)
        .map(loc => ({
            position: loc.coords,
            popupContent: `<strong>${loc.name}</strong><br/>${loc.address}`
        }));
  }, [locations]);

  const center: LatLngTuple = markers.length > 0 ? markers[0].position as LatLngTuple : [30.0444, 31.2357];
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
             <Map key={`map-${company.id}`} center={center} zoom={zoom} scrollWheelZoom={false}>
               <ChangeView center={center} zoom={zoom} />
               <MapTileLayer />
               <MapMarkers markers={markers} />
             </Map>
           )}
           {!loading && !error && markers.length === 0 && (
             <div className="flex items-center justify-center h-full text-muted-foreground">No locations with valid addresses found.</div>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
