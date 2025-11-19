'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Manufacturer } from '@/lib/types';
import { ImageUpload } from '@/components/ui/image-upload';
import { X } from 'lucide-react';
import Image from 'next/image';

interface ManufacturerFormProps {
  manufacturer?: Manufacturer;
  onSubmit: (manufacturer: Omit<Manufacturer, 'id'> & { iconFile?: File } | Partial<Manufacturer> & { iconFile?: File }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ManufacturerForm({ manufacturer, onSubmit, onCancel, isSubmitting }: ManufacturerFormProps) {
  const [name, setName] = useState(manufacturer?.name || '');
  const [description, setDescription] = useState(manufacturer?.description || '');
  const [color, setColor] = useState(manufacturer?.color || '#3b82f6');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(manufacturer?.icon || null);

  // Handle icon file selection
  const handleIconFilesChange = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    } else {
      setIconFile(null);
      setIconPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create the manufacturer data object based on whether we're editing or adding
    let manufacturerData: Omit<Manufacturer, 'id'> & { iconFile?: File } | Partial<Manufacturer> & { iconFile?: File };
    
    if (manufacturer) {
      // For editing, send partial updates only for changed fields
      const updates: Partial<Manufacturer> & { iconFile?: File } = {};
      
      if (name !== manufacturer.name) updates.name = name;
      if (description !== manufacturer.description) updates.description = description;
      if (color !== manufacturer.color) updates.color = color;
      if (iconPreview !== manufacturer.icon) updates.icon = iconPreview || '';
      if (iconFile) updates.iconFile = iconFile;
      
      manufacturerData = updates;
    } else {
      // For adding, send complete manufacturer object
      manufacturerData = {
        name,
        description,
        color,
        icon: iconPreview || '',
        tags: [], // Default empty array for new manufacturers
        ...(iconFile && { iconFile }),
      };
    }
    
    await onSubmit(manufacturerData);
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (iconPreview && iconPreview.startsWith('blob:')) {
        URL.revokeObjectURL(iconPreview);
      }
    };
  }, [iconPreview]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{manufacturer ? 'Edit Manufacturer' : 'Add New Manufacturer'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter manufacturer name"
              required={!manufacturer} // Only required for new manufacturers
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter manufacturer description"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="color">Brand Color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>
          
          <div>
            <Label>Icon</Label>
            {iconPreview ? (
              <div className="relative mt-2">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                  <Image 
                    src={iconPreview} 
                    alt="Icon preview" 
                    width={64} 
                    height={64} 
                    className="object-contain"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={() => {
                    setIconPreview(null);
                    setIconFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <ImageUpload onFilesChange={handleIconFilesChange} maxFiles={1} />
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (manufacturer ? 'Update Manufacturer' : 'Add Manufacturer')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
