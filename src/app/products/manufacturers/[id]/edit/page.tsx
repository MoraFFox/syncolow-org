'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useManufacturerStore } from '@/store/use-manufacturer-store';
import { ManufacturerForm } from '../../_components/manufacturer-form';
import { Manufacturer } from '@/lib/types';

import React from 'react';

export default function EditManufacturerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const { manufacturers, updateManufacturer } = useManufacturerStore();
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const foundManufacturer = manufacturers.find(m => m.id === resolvedParams.id);
    if (foundManufacturer) {
      setManufacturer(foundManufacturer);
    } else {
      // It's possible the store hasn't loaded yet, so we don't redirect immediately.
      // A loading state would be ideal here.
    }
  }, [manufacturers, resolvedParams.id, router]);

  const handleSubmit = async (updatedManufacturer: Omit<Manufacturer, 'id'> & { iconFile?: File } | Partial<Manufacturer> & { iconFile?: File }) => {
    if (manufacturer) {
      try {
        setIsSubmitting(true);
        await updateManufacturer(manufacturer.id, updatedManufacturer);
        router.push(`/products/manufacturers/${manufacturer.id}`);
      } catch (error) {
        console.error('Error updating manufacturer:', error);
        // Optionally, show an error toast to the user
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancel = () => {
    if (manufacturer) {
      router.push(`/products/manufacturers/${manufacturer.id}`);
    } else {
      router.back();
    }
  };

  if (!manufacturer) {
    return <div>Loading...</div>; // Or a skeleton loader
  }

 return (
    <div className="container mx-auto py-10">
      <ManufacturerForm 
        manufacturer={manufacturer}
        onSubmit={handleSubmit} 
        onCancel={handleCancel} 
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
