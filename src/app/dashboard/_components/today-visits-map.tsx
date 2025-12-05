/** @format */

"use client";

import { useMemo, useState, useEffect } from "react";
import { LatLngTuple } from "leaflet";
import { Skeleton } from "@/components/ui/skeleton";
// Removed unused Card imports
import { Button } from "@/components/ui/button";
import { computeZoomToFit } from "../_lib/map-utils";
// Removed unused Select imports

import {
  GoogleMapWrapper,
  Marker,
  InfoWindow,
  MarkerClusterer,
} from "@/components/ui/google-map-wrapper";
import { useTodayVisits } from "../_hooks/use-dashboard-data";
import { SectionCard } from "./section-card";

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
  const { data: visitsData, isLoading } = useTodayVisits();
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({
    lat: 30.0444,
    lng: 31.2357,
  });
  const [mapZoom, setMapZoom] = useState(8);

  const selectedVisit = useMemo(() => {
    return (visitsData || []).find(
      (v: VisitWithCoords) => v.id === selectedVisitId
    );
  }, [selectedVisitId, visitsData]);

  const markers = useMemo(() => {
    return (visitsData || [])
      .filter(
        (v: VisitWithCoords): v is VisitWithCoords & { coords: LatLngTuple } =>
          v.coords !== null
      )
      .map((v: VisitWithCoords) => ({
        id: v.id,
        position: { lat: v.coords[0], lng: v.coords[1] },
        content: `<strong>${v.clientName}</strong><br/>${v.address}`,
      }));
  }, [visitsData]);

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

  const headerAction =
    markers.length > 0 ? (
      <Button
        variant='outline'
        size='sm'
        onClick={() => {
          const coordsList = (visitsData || [])
            .filter((v: VisitWithCoords) => v.coords)
            .map((v: VisitWithCoords) => v.coords as LatLngTuple);
          if (coordsList.length === 0) return;
          const { center, zoom } = computeZoomToFit(coordsList);
          setSelectedVisitId(null);
          setMapCenter(center);
          setMapZoom(zoom);
        }}
      >
        Zoom to Fit
      </Button>
    ) : null;

  if (isLoading) {
    return <Skeleton className='h-[500px] w-full' />;
  }

  return (
    <SectionCard
      title="Today's Visits Map"
      description='Locations for all scheduled visits for today.'
      headerAction={headerAction}
    >
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
    </SectionCard>
  );
}
