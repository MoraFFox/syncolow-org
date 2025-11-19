
"use client";

import { useState, useEffect, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { geocodeService } from '@/services/geocode-service';
import { Skeleton } from '@/components/ui/skeleton';
import { LatLngTuple } from 'leaflet';
import { useDebouncedCallback } from 'use-debounce';
import { Search } from 'lucide-react';

const MapDisplay = dynamic(() => import('./map-display').then(mod => mod.MapDisplay), {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
});


interface LocationPickerDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    initialAddress?: string | null;
    onConfirm: (address: string) => void;
}

export function LocationPickerDialog({ isOpen, onOpenChange, initialAddress, onConfirm }: LocationPickerDialogProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [position, setPosition] = useState<LatLngTuple | null>(null);
    const [selectedAddress, setSelectedAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const defaultCenter: LatLngTuple = [51.505, -0.09];

    const initialize = useCallback(async () => {
        if (initialAddress) {
            setSelectedAddress(initialAddress);
            setSearchTerm(initialAddress);
            setIsLoading(true);
            const coords = await geocodeService.geocode(initialAddress);
            setPosition(coords || defaultCenter);
            setIsLoading(false);
        } else {
            setPosition(defaultCenter);
            setSelectedAddress('');
            setSearchTerm('');
        }
    }, [initialAddress]);

    useEffect(() => {
        if(isOpen) {
            initialize();
        }
    }, [isOpen, initialize]);

    const handleMapClick = useDebouncedCallback(async (latlng: { lat: number, lng: number }) => {
        setPosition([latlng.lat, latlng.lng]);
        setIsLoading(true);
        const address = await geocodeService.reverseGeocode(latlng.lat, latlng.lng);
        if (address) {
            setSelectedAddress(address);
            setSearchTerm(address);
        }
        setIsLoading(false);
    }, 300);

    const handleSearch = useDebouncedCallback(async (term: string) => {
        if (term.length < 3) return;
        setIsLoading(true);
        const coords = await geocodeService.geocode(term);
        if (coords) {
            setPosition(coords);
            const address = await geocodeService.reverseGeocode(coords[0], coords[1]);
            if (address) {
                setSelectedAddress(address);
            }
        }
        setIsLoading(false);
    }, 500);

    const handleConfirmClick = () => {
        onConfirm(selectedAddress);
        onOpenChange(false);
    }

    const memoizedHandleMapClick = useCallback(handleMapClick, [handleMapClick]);

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
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search for an address..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                handleSearch(e.target.value);
                            }}
                            className="pl-8"
                        />
                    </div>
                    <div className="h-[300px] w-full rounded-md overflow-hidden border">
                       {position ? (
                         <MapDisplay position={position} handleMapClick={memoizedHandleMapClick} />
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
