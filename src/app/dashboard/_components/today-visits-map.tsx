
"use client"

import { useMemo, useState, useEffect } from "react";
import { useOrderStore } from "@/store/use-order-store";
import { useCompanyStore } from "@/store/use-company-store";
import { isToday } from "date-fns";
import { LatLngTuple } from "leaflet";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { geocodeService } from "@/services/geocode-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VisitCall } from '@/lib/types';

import { Map } from '@/components/ui/map';
import { ChangeView, MapTileLayer, MapMarkers, MapMarkerProps } from '@/components/ui/map-client';


interface VisitWithCoords {
    id: string;
    clientName: string;
    address: string;
    coords: LatLngTuple | null;
    outcome?: string;
    notes?: string;
}

export function TodayVisitsMap() {
    const { visits } = useOrderStore();
    const { companies } = useCompanyStore();
    const [visitsWithCoords, setVisitsWithCoords] = useState<VisitWithCoords[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

    useEffect(() => {
        if (!companies || companies.length === 0) {
            setIsLoading(false);
            return;
        };

        const todayClientVisits = visits.filter(v => v.type === 'Visit' && v.address && isToday(new Date(v.date)))
                                     .map(v => ({ id: v.id, clientName: v.clientName || 'Custom', address: v.address!, outcome: v.outcome }));

        const geocodeVisits = async () => {
            if (todayClientVisits.length === 0) {
                setVisitsWithCoords([]);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const geocoded = await Promise.all(
                todayClientVisits.map(async v => {
                    const coords = await geocodeService.geocode(v.address);
                    return { ...v, coords };
                })
            );
            setVisitsWithCoords(geocoded);
            if (geocoded.length > 0 && !selectedVisitId) {
                const firstValidVisit = geocoded.find(v => v.coords);
                if(firstValidVisit) setSelectedVisitId(firstValidVisit.id);
            }
            setIsLoading(false);
        };

        geocodeVisits();

    }, [visits, companies, selectedVisitId]);
    
    const selectedVisit = useMemo(() => {
        return visitsWithCoords.find(v => v.id === selectedVisitId);
    }, [selectedVisitId, visitsWithCoords]);
    
     const markers: MapMarkerProps[] = useMemo(() => {
        return visitsWithCoords
            .filter((v): v is VisitWithCoords & { coords: LatLngTuple } => v.coords !== null)
            .map(v => ({
                position: v.coords,
                popupContent: `<strong>${v.clientName}</strong><br/>${v.address}`
            }));
    }, [visitsWithCoords]);


    const center: LatLngTuple = selectedVisit?.coords || (markers.length > 0 ? markers[0].position as LatLngTuple : [30.0444, 31.2357]);
    const zoom = selectedVisit ? 13 : 8;


    if (isLoading) {
        return <Skeleton className="h-[500px] w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Today's Visits Map</CardTitle>
                <CardDescription>Locations for all scheduled visits for today.</CardDescription>
            </CardHeader>
            <CardContent>
                {markers.length > 0 ? (
                    <Map
                        className="h-[400px] w-full rounded-md overflow-hidden border"
                        center={center}
                        zoom={zoom}
                        scrollWheelZoom={false}
                    >
                        <ChangeView center={center} zoom={zoom} />
                        <MapTileLayer />
                        <MapMarkers markers={markers} />
                    </Map>
                ) : (
                    <div className="h-[400px] w-full rounded-md overflow-hidden border flex items-center justify-center text-muted-foreground">
                        No visits with locations scheduled for today.
                    </div>
                )}
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
