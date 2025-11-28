'use client';

import { GoogleMap, useJsApiLoader, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { ReactNode, memo, useCallback, useState } from 'react';
import { Skeleton } from './skeleton';

const containerStyle = {
  width: '100%',
  height: '100%'
};

interface GoogleMapWrapperProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  children?: ReactNode;
  className?: string;
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onLoad?: (map: google.maps.Map) => void;
  onUnmount?: (map: google.maps.Map) => void;
}

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

function GoogleMapWrapperComponent({ center, zoom, children, className, onClick, onLoad, onUnmount }: GoogleMapWrapperProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const handleLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    if (onLoad) onLoad(map);
  }, [onLoad]);

  const handleUnmount = useCallback((map: google.maps.Map) => {
    setMap(null);
    if (onUnmount) onUnmount(map);
  }, [onUnmount]);

  if (!isLoaded) {
    return <Skeleton className={className || "h-full w-full"} />;
  }

  return (
    <div className={className}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={zoom}
          onClick={onClick}
          onLoad={handleLoad}
          onUnmount={handleUnmount}
          options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
          }}
        >
          {children}
        </GoogleMap>
    </div>
  );
}

export const GoogleMapWrapper = memo(GoogleMapWrapperComponent);
export { Marker, InfoWindow, MarkerClusterer };
