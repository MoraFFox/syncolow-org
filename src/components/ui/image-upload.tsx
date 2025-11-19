
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';
import { Button } from './button';
import Image from 'next/image';

interface ImageUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}

export function ImageUpload({ onFilesChange, maxFiles = 5 }: ImageUploadProps) {
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const updateFiles = (newFiles: File[]) => {
    setLocalFiles(newFiles);
    onFilesChange(newFiles);
    
    // Cleanup old previews
    previews.forEach(URL.revokeObjectURL);
    
    // Create new previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => previews.forEach(URL.revokeObjectURL);
  }, [previews]);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const combinedFiles = [...localFiles, ...newFiles].slice(0, maxFiles);
    updateFiles(combinedFiles);
  }, [localFiles, maxFiles, onFilesChange]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleFilesAdded(acceptedFiles);
  }, [handleFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: maxFiles - localFiles.length,
  });

  const removeImage = (index: number) => {
    const newLocalFiles = localFiles.filter((_, i) => i !== index);
    updateFiles(newLocalFiles);
  };

  const canUploadMore = localFiles.length < maxFiles;

  return (
    <div className="space-y-4">
      {canUploadMore && (
        <div
          {...getRootProps()}
          className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-primary'}`}>
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {isDragActive ? 'Drop the files here...' : "Drag 'n' drop some files here, or click to select"}
          </p>
          <p className="text-xs text-muted-foreground/80">Up to {maxFiles - localFiles.length} more images</p>
        </div>
      )}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group aspect-square">
              <Image src={preview} alt={`Preview ${index + 1}`} width={160} height={160} className="object-cover w-full h-full rounded-md" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
