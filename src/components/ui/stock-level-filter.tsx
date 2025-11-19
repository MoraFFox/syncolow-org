import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface StockLevelFilterProps {
  selectedLevels: string[];
  onLevelChange: (level: string, checked: boolean) => void;
  className?: string;
}

const StockLevelFilter: React.FC<StockLevelFilterProps> = ({ 
  selectedLevels, 
  onLevelChange,
  className = ''
}) => {
 const stockLevels = [
    { id: 'in-stock', label: 'In Stock', value: 'in-stock' },
    { id: 'low-stock', label: 'Low Stock', value: 'low-stock' },
    { id: 'out-of-stock', label: 'Out of Stock', value: 'out-of-stock' },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>Stock Level</Label>
      <div className="space-y-2">
        {stockLevels.map((level) => (
          <div key={level.id} className="flex items-center space-x-2">
            <Checkbox
              id={level.id}
              checked={selectedLevels.includes(level.value)}
              onCheckedChange={(checked) => onLevelChange(level.value, Boolean(checked))}
            />
            <Label htmlFor={level.id} className="text-sm">
              {level.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockLevelFilter;