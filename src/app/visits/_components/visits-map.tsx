
"use client"

import { useMemo, useState, useEffect } from "react";
import { LatLngTuple } from "leaflet";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VisitCall } from "@/lib/types";
import { geocodeService } from "@/services/geocode-service";
import { Map } from '@/components/ui/map';
import { ChangeView, MapTileLayer, MapMarkers, MapMarkerProps } from '@/components/ui/map-client';


interface VisitsMapProps {
    visits: VisitCall[];
}

interface VisitWithCoords extends VisitCall {
    coords: LatLngTuple | null;
}


export function VisitsMap({ visits }: VisitsMapProps) {
    const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
    const [visitsWithCoords, setVisitsWithCoords] = useState<VisitWithCoords[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const geocodeVisits = async () => {
            if (visits.length === 0) {
                setVisitsWithCoords([]);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const geocoded = await Promise.all(
                visits.map(async (visit) => {
                    const coords = visit.address ? await geocodeService.geocode(visit.address) : null;
                    return { ...visit, coords };
                })
            );
            setVisitsWithCoords(geocoded);

            if (geocoded.length > 0) {
                const firstValidVisit = geocoded.find(v => v.coords);
                if (firstValidVisit) {
                   if(!selectedVisitId || !geocoded.find(v => v.id === selectedVisitId)) {
                     setSelectedVisitId(firstValidVisit.id);
                   }
                }
            }
            setIsLoading(false);
        };

        geocodeVisits();
    }, [visits, selectedVisitId]);

    const markers: MapMarkerProps[] = useMemo(() => {
        return visitsWithCoords
            .filter((v): v is VisitWithCoords & { coords: LatLngTuple } => v.coords !== null)
            .map(v => ({
                position: v.coords,
                popupContent: `<strong>${v.clientName}</strong><br/>${v.outcome}`
            }));
    }, [visitsWithCoords]);

    const selectedVisit = useMemo(() => {
        return visitsWithCoords.find(v => v.id === selectedVisitId);
    }, [selectedVisitId, visitsWithCoords]);

    const center: LatLngTuple = selectedVisit?.coords || (markers.length > 0 ? markers[0].position as LatLngTuple : [30.0444, 31.2357]);
    const zoom = selectedVisit ? 13 : 8;

    if (isLoading) {
        return <Skeleton className="h-[500px] w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Visits Map</CardTitle>
                <CardDescription>Geographical overview of upcoming visits.</CardDescription>
            </CardHeader>
            <CardContent>
                <Map center={center} zoom={zoom} scrollWheelZoom={false} className="h-[400px] w-full rounded-md border">
                    <ChangeView center={center} zoom={zoom} />
                    <MapTileLayer />
                    <MapMarkers markers={markers} />
                </Map>
                 {visitsWithCoords.filter(v => v.coords).length > 0 && (
                    <div className="mt-4">
                        <Select value={selectedVisitId || ''} onValueChange={setSelectedVisitId}>
                             <SelectTrigger>
                                <SelectValue placeholder="Select a visit to view on map..." />
                            </SelectTrigger>
                            <SelectContent>
                                {visitsWithCoords.filter(v => v.coords).map(visit => (
                                    <SelectItem key={visit.id} value={visit.id}>
                                       {visit.clientName} - {visit.address}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedVisit && (
                            <div className="mt-2 text-sm text-muted-foreground p-2 border rounded-md">
                                <p><strong>Notes:</strong> {selectedVisit.outcome || 'N/A'}</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
