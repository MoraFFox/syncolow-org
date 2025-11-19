'use client';
import dynamic from 'next/dynamic';
import { MapContainerProps } from 'react-leaflet';
import { Skeleton } from './skeleton';


const MapComponent = dynamic(() => import('./map-client').then((m) => m.Map), {
 ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export function Map(props: MapContainerProps) {
  return <MapComponent {...props} />;
}
