
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { geocodeService } from '@/services/geocode-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { useJsApiLoader, Autocomplete, GoogleMap, Marker } from '@react-google-maps/api';

interface LocationPickerDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    initialAddress?: string | null;
    onConfirm: (address: string) => void;
}

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];
const defaultCenter = { lat: 51.505, lng: -0.09 };

export function LocationPickerDialog({ isOpen, onOpenChange, initialAddress, onConfirm }: LocationPickerDialogProps) {
    const [position, setPosition] = useState<google.maps.LatLngLiteral>(defaultCenter);
    const [selectedAddress, setSelectedAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries
    });

    const initialize = useCallback(async () => {
        if (initialAddress) {
            setSelectedAddress(initialAddress);
            setIsLoading(true);
            const coords = await geocodeService.geocode(initialAddress);
            if (coords) {
                setPosition({ lat: coords[0], lng: coords[1] });
            }
            setIsLoading(false);
        } else {
            setPosition(defaultCenter);
            setSelectedAddress('');
        }
    }, [initialAddress]);

    useEffect(() => {
        if(isOpen) {
            initialize();
        }
    }, [isOpen, initialize]);

    const onAutocompleteLoad = (autoC: google.maps.places.Autocomplete) => {
        setAutocomplete(autoC);
    };

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                setPosition({ lat, lng });
                setSelectedAddress(place.formatted_address || '');
                mapRef.current?.panTo({ lat, lng });
                mapRef.current?.setZoom(15);
            }
        }
    };

    const handleMapClick = async (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setPosition({ lat, lng });
            setIsLoading(true);
            const address = await geocodeService.reverseGeocode(lat, lng);
            if (address) {
                setSelectedAddress(address);
            }
            setIsLoading(false);
        }
    };

    const handleConfirmClick = () => {
        onConfirm(selectedAddress);
        onOpenChange(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Select Location</DialogTitle>
                    <DialogDescription>
                        Search for an address or click on the map to set a location.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="relative">
                        {isLoaded ? (
                            <Autocomplete
                                onLoad={onAutocompleteLoad}
                                onPlaceChanged={onPlaceChanged}
                            >
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                                    <Input
                                        placeholder="Search for an address..."
                                        defaultValue={selectedAddress}
                                        onChange={(e) => setSelectedAddress(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </Autocomplete>
                        ) : (
                            <Skeleton className="h-10 w-full" />
                        )}
                    </div>
                    <div className="h-[300px] w-full rounded-md overflow-hidden border">
                       {isLoaded ? (
                         <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '100%' }}
                            center={position}
                            zoom={13}
                            onClick={handleMapClick}
                            onLoad={(map) => { mapRef.current = map; }}
                            options={{
                                streetViewControl: false,
                                mapTypeControl: false,
                            }}
                         >
                            <Marker position={position} />
                         </GoogleMap>
                       ) : <Skeleton className="h-full w-full" />}
                    </div>
                    <div className="p-2 border rounded-md min-h-[40px]">
                        <p className="text-sm text-muted-foreground">
                            {isLoading ? "Searching..." : selectedAddress || "No address selected"}
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirmClick} disabled={!selectedAddress}>Confirm Location</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
