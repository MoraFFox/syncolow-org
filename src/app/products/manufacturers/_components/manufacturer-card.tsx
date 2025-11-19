import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Manufacturer } from '@/lib/types';
import { Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface ManufacturerCardProps {
  manufacturer: Manufacturer;
  onDelete: (id: string) => void;
}

export function ManufacturerCard({ manufacturer, onDelete }: ManufacturerCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{manufacturer.name}</CardTitle>
          <Badge 
            variant="secondary" 
            style={{ backgroundColor: manufacturer.color }}
            className="text-white"
          >
            {manufacturer.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start mb-4">
          {manufacturer.icon && (
            <div className="mr-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-md overflow-hidden border border-gray-200 flex items-center justify-center">
                <Image 
                  src={manufacturer.icon} 
                  alt={`${manufacturer.name} icon`} 
                  width={40} 
                  height={40} 
                  className="object-contain"
                />
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground line-clamp-2 flex-grow">
            {manufacturer.description}
          </p>
        </div>
        <div className="flex justify-between items-center">
          <Link href={`/products/manufacturers/${manufacturer.id}`}>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </Link>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={() => onDelete(manufacturer.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}