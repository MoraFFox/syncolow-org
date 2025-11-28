
"use client"

import { useMemo, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VisitCall } from "@/lib/types";
import { geocodeService } from "@/services/geocode-service";
import { GoogleMapWrapper } from "@/components/ui/google-map-wrapper";
import { Marker, InfoWindow } from "@react-google-maps/api";

interface VisitsMapProps {
    visits: VisitCall[];
}

interface VisitWithCoords extends VisitCall {
    coords: [number, number] | null;
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

    const markers = useMemo(() => {
        return visitsWithCoords
            .filter((v): v is VisitWithCoords & { coords: [number, number] } => v.coords !== null)
            .map(v => ({
                id: v.id,
                position: { lat: v.coords[0], lng: v.coords[1] },
                visit: v
            }));
    }, [visitsWithCoords]);

    const selectedVisit = useMemo(() => {
        return visitsWithCoords.find(v => v.id === selectedVisitId);
    }, [selectedVisitId, visitsWithCoords]);

    const center = selectedVisit?.coords 
        ? { lat: selectedVisit.coords[0], lng: selectedVisit.coords[1] } 
        : (markers.length > 0 ? markers[0].position : { lat: 30.0444, lng: 31.2357 });
    
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
                <GoogleMapWrapper 
                    center={center} 
                    zoom={zoom} 
                    className="h-[400px] w-full rounded-md border overflow-hidden"
                >
                    {markers.map((marker) => (
                        <Marker 
                            key={marker.id} 
                            position={marker.position} 
                            onClick={() => setSelectedVisitId(marker.id)}
                        />
                    ))}

                    {selectedVisit && selectedVisit.coords && (
                        <InfoWindow
                            position={{ lat: selectedVisit.coords[0], lng: selectedVisit.coords[1] }}
                            onCloseClick={() => setSelectedVisitId(null)}
                        >
                            <div className="p-2 max-w-[200px] text-black">
                                <div className="font-semibold mb-1">{selectedVisit.clientName}</div>
                                <div className="text-sm mb-2">{selectedVisit.outcome}</div>
                                <a 
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVisit.coords[0]},${selectedVisit.coords[1]}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-xs font-medium block"
                                >
                                    Open in Google Maps
                                </a>
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMapWrapper>

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
