'use client';

import { useRouter } from 'next/navigation';
import { useManufacturerStore } from '@/store/use-manufacturer-store';
import { ManufacturerForm } from '../_components/manufacturer-form';
import { Manufacturer } from '@/lib/types';
import { useState } from 'react';

export default function AddManufacturerPage() {
 const router = useRouter();
  const { addManufacturer } = useManufacturerStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (manufacturer: Omit<Manufacturer, 'id'> & { iconFile?: File } | Partial<Manufacturer> & { iconFile?: File }) => {
    try {
      setIsSubmitting(true);
      if (!manufacturer.name) {
        throw new Error('Manufacturer name is required');
      }
      
      const newManufacturer = await addManufacturer({
        name: manufacturer.name,
        description: manufacturer.description || '',
        icon: manufacturer.icon || '',
        color: manufacturer.color || '#3b82f6',
        tags: manufacturer.tags || [],
        ...(manufacturer.iconFile && { iconFile: manufacturer.iconFile })
      });
      router.push(`/products/manufacturers/${newManufacturer.id}`);
    } catch (error) {
      console.error('Error adding manufacturer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto py-10">
      <ManufacturerForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
