/** @format */

"use client";

import { useMemo, useState, useEffect } from "react";
import { useOrderStore } from "@/store/use-order-store";
import { useCompanyStore } from "@/store/use-company-store";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { isToday } from "date-fns";
import { LatLngTuple } from "leaflet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { computeZoomToFit } from "../_lib/map-utils";
import { geocodeService } from "@/services/geocode-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  GoogleMapWrapper,
  Marker,
  InfoWindow,
  MarkerClusterer,
} from "@/components/ui/google-map-wrapper";

interface VisitWithCoords {
  id: string;
  clientName: string;
  address: string;
  coords: LatLngTuple | null;
  outcome?: string;
  notes?: string;
  type?: string;
  date?: string;
}

export function TodayVisitsMap() {
  const { visits } = useOrderStore();
  const { maintenanceVisits } = useMaintenanceStore();
  const { companies } = useCompanyStore();
  const [visitsWithCoords, setVisitsWithCoords] = useState<VisitWithCoords[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({
    lat: 30.0444,
    lng: 31.2357,
  });
  const [mapZoom, setMapZoom] = useState(8);

  useEffect(() => {
    if (!companies || companies.length === 0) {
      setIsLoading(false);
      return;
    }

    const todayClientVisits = visits
      .filter(
        (v) =>
          v.type === "Visit" &&
          v.address &&
          isToday(new Date(v.date)) &&
          v.status !== "Completed"
      )
      .map((v) => ({
        id: v.id,
        clientName: v.clientName || "Custom",
        address: v.address!,
        outcome: v.outcome,
        type: "Visit",
        date: v.date,
      }));

    const todayMaintenanceVisits = maintenanceVisits
      .filter(
        (v) =>
          v.status === "Scheduled" &&
          v.date &&
          isToday(new Date(v.date as string))
      )
      .map((v) => {
        const entity = companies.find(
          (c) => c.id === v.branchId || c.id === v.companyId
        );
        const address = entity?.location || entity?.warehouseLocation || "";

        return {
          id: v.id,
          clientName: v.branchName || v.companyName || "Maintenance",
          address: address,
          outcome: v.maintenanceNotes,
          type: "Maintenance",
          date: v.date as string,
        };
      })
      .filter((v) => v.address);

    const allVisits = [...todayClientVisits, ...todayMaintenanceVisits];

    const geocodeVisits = async () => {
      if (allVisits.length === 0) {
        setVisitsWithCoords([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const geocoded = await Promise.all(
        allVisits.map(async (v) => {
          const coords = await geocodeService.geocode(v.address);
          return { ...v, coords };
        })
      );
      setVisitsWithCoords(geocoded);
      // Only auto-select on initial load, not when user closes InfoWindow
      if (
        geocoded.length > 0 &&
        selectedVisitId === null &&
        visitsWithCoords.length === 0
      ) {
        const firstValidVisit = geocoded.find((v) => v.coords !== null);
        if (firstValidVisit) setSelectedVisitId(firstValidVisit.id);
      }
      setIsLoading(false);
    };

    geocodeVisits();
  }, [visits, maintenanceVisits, companies]);

  const selectedVisit = useMemo(() => {
    return visitsWithCoords.find((v) => v.id === selectedVisitId);
  }, [selectedVisitId, visitsWithCoords]);

  const markers = useMemo(() => {
    return visitsWithCoords
      .filter(
        (v): v is VisitWithCoords & { coords: LatLngTuple } => v.coords !== null
      )
      .map((v) => ({
        id: v.id,
        position: { lat: v.coords[0], lng: v.coords[1] },
        content: `<strong>${v.clientName}</strong><br/>${v.address}`,
      }));
  }, [visitsWithCoords]);

  // Update map center and zoom when visit selection changes
  useEffect(() => {
    if (selectedVisitId && selectedVisit && selectedVisit.coords) {
      // Visit selected: zoom in
      setMapCenter({
        lat: selectedVisit.coords[0],
        lng: selectedVisit.coords[1],
      });
      setMapZoom(13);
    } else if (!selectedVisitId && markers.length > 0) {
      // Visit deselected: zoom out to show all visits
      setMapCenter(markers[0].position);
      setMapZoom(8);
    }
  }, [selectedVisitId, selectedVisit, markers]);

  // Set initial map position when visits load
  useEffect(() => {
    if (
      markers.length > 0 &&
      mapCenter.lat === 30.0444 &&
      mapCenter.lng === 31.2357
    ) {
      setMapCenter(markers[0].position);
      setMapZoom(8);
    }
  }, [markers]);

  if (isLoading) {
    return <Skeleton className='h-[500px] w-full' />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Visits Map</CardTitle>
        <CardDescription>
          Locations for all scheduled visits for today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {markers.length > 0 ? (
          <GoogleMapWrapper
            className='h-[400px] w-full rounded-md overflow-hidden border'
            center={mapCenter}
            zoom={mapZoom}
          >
            <MarkerClusterer>
              {(clusterer) => (
                <>
                  {markers.map((marker) => (
                    <Marker
                      key={marker.id}
                      position={marker.position}
                      clusterer={clusterer}
                      onClick={() => setSelectedVisitId(marker.id)}
                    />
                  ))}
                </>
              )}
            </MarkerClusterer>

            {selectedVisit && selectedVisit.coords && (
              <InfoWindow
                position={{
                  lat: selectedVisit.coords[0],
                  lng: selectedVisit.coords[1],
                }}
                onCloseClick={() => setSelectedVisitId(null)}
              >
                <div className='p-2 max-w-[250px] text-black'>
                  <div className='font-semibold mb-1'>
                    {selectedVisit.clientName}
                  </div>
                  <div className='text-sm mb-2'>{selectedVisit.address}</div>
                  <div className='flex flex-col gap-2'>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVisit.coords[0]},${selectedVisit.coords[1]}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600 hover:underline text-xs font-medium block'
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMapWrapper>
        ) : (
          <div className='h-[400px] w-full rounded-md overflow-hidden border flex items-center justify-center text-muted-foreground'>
            No visits with locations scheduled for today.
          </div>
        )}
        {visitsWithCoords.filter((v) => v.coords).length > 0 && (
          <div className='mt-4'>
            <div className='flex items-center gap-2 mb-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  const coordsList = visitsWithCoords
                    .filter((v) => v.coords)
                    .map((v) => v.coords as LatLngTuple);
                  if (coordsList.length === 0) return;
                  const { center, zoom } = computeZoomToFit(coordsList);
                  setSelectedVisitId(null);
                  setMapCenter(center);
                  setMapZoom(zoom);
                }}
              >
                Zoom to Fit
              </Button>
            </div>
            <Select
              value={selectedVisitId || ""}
              onValueChange={setSelectedVisitId}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a visit to view on map...' />
              </SelectTrigger>
              <SelectContent>
                {visitsWithCoords
                  .filter((v) => v.coords)
                  .map((visit) => (
                    <SelectItem key={visit.id} value={visit.id}>
                      {visit.clientName} - {visit.address}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedVisit && (
              <div className='mt-2 text-sm text-muted-foreground p-2 border rounded-md'>
                <p>
                  <strong>Notes:</strong> {selectedVisit.outcome || "N/A"}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
