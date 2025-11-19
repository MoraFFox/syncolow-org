
'use client';

import { useRef, useEffect, memo } from 'react';
import L, { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

export const MapDisplay = memo(function MapDisplay({
    position,
    handleMapClick,
}: {
    position: LatLngTuple;
    handleMapClick: (latlng: { lat: number; lng: number }) => void;
}) {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<L.Marker | null>(null);

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current).setView(position, 13);
            mapRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(map);

            const marker = L.marker(position).addTo(map);
            markerRef.current = marker;

            map.on('click', (e) => {
                handleMapClick(e.latlng);
            });
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array is intentional here

    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.setView(position, 13);
        }
        if (markerRef.current) {
            markerRef.current.setLatLng(position);
        }
    }, [position]);

    return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />;
});

MapDisplay.displayName = 'MapDisplay';
