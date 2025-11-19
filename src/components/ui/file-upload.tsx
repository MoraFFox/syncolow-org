
"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileUploadProps {
    onFilesChange: (files: File[]) => void;
}

export function FileUpload({ onFilesChange }: FileUploadProps) {
    const [files, setFiles] = useState<File[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = [...files, ...acceptedFiles];
        setFiles(newFiles);
        onFilesChange(newFiles);
    }, [files, onFilesChange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const removeFile = (fileToRemove: File) => {
        const newFiles = files.filter(file => file !== fileToRemove);
        setFiles(newFiles);
        onFilesChange(newFiles);
    };

    return (
        <div>
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-primary'
                }`}
            >
                <input {...getInputProps()} />
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                {isDragActive ? (
                    <p className="mt-4 text-primary">Drop the files here ...</p>
                ) : (
                    <p className="mt-4 text-muted-foreground">Drag 'n' drop some files here, or click to select files</p>
                )}
            </div>
            {files.length > 0 && (
                <ScrollArea className="h-40 mt-4 border rounded-lg p-2">
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                <div className="flex items-center gap-2">
                                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm">{file.name}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(file)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}
