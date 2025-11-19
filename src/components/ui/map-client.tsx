'use client';
import { useMap } from 'react-leaflet/hooks';
import { TileLayer, Marker, Popup } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { MapContainer, MapContainerProps } from 'react-leaflet';
import { useRef, useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

export function ChangeView({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export function MapTileLayer() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  );
}

export interface MapMarkerProps {
  position: LatLngExpression;
  popupContent?: React.ReactNode;
}

export function MapMarkers({ markers }: { markers: MapMarkerProps[] }) {
  return (
    <>
      {markers.map((marker, index) => (
        <Marker key={index} position={marker.position}>
          {marker.popupContent && <Popup>{marker.popupContent}</Popup>}
        </Marker>
      ))}
    </>
  );
}

export function Map(props: MapContainerProps) {
  return <MapContainer {...props} />;
}
