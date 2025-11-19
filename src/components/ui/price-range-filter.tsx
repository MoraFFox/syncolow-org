import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PriceRangeFilterProps {
  minPrice: number;
  maxPrice: number;
  onPriceChange: (min: number, max: number) => void;
  className?: string;
}

const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({ 
  minPrice, 
  maxPrice, 
  onPriceChange,
  className = ''
}) => {
 const [minValue, setMinValue] = useState(minPrice);
  const [maxValue, setMaxValue] = useState(maxPrice);
  const [inputMin, setInputMin] = useState(minPrice.toString());
  const [inputMax, setInputMax] = useState(maxPrice.toString());

  // Update inputs when minPrice/maxPrice props change
  useEffect(() => {
    setMinValue(minPrice);
    setMaxValue(maxPrice);
    setInputMin(minPrice.toString());
    setInputMax(maxPrice.toString());
  }, [minPrice, maxPrice]);

  const handleSliderChange = (value: number[]) => {
    const [newMin, newMax] = value;
    setMinValue(newMin);
    setMaxValue(newMax);
    setInputMin(newMin.toString());
    setInputMax(newMax.toString());
    onPriceChange(newMin, newMax);
  };

  const handleInputChange = (type: 'min' | 'max', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      if (type === 'min') {
        setInputMin(value);
        if (numValue <= maxValue) {
          setMinValue(numValue);
          onPriceChange(numValue, maxValue);
        }
      } else {
        setInputMax(value);
        if (numValue >= minValue) {
          setMaxValue(numValue);
          onPriceChange(minValue, numValue);
        }
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <Label>Price Range</Label>
      </div>
      
      <Slider
        min={0}
        max={maxPrice || 1000}
        step={1}
        value={[minValue, maxValue]}
        onValueChange={handleSliderChange}
        className="w-full"
      />
      
      <div className="flex space-x-2">
        <div className="flex-1">
          <Label className="text-xs">Min</Label>
          <Input
            type="number"
            value={inputMin}
            onChange={(e) => handleInputChange('min', e.target.value)}
            className="mt-1"
            min={0}
            max={maxValue}
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Max</Label>
          <Input
            type="number"
            value={inputMax}
            onChange={(e) => handleInputChange('max', e.target.value)}
            className="mt-1"
            min={minValue}
            max={maxPrice || 100}
          />
        </div>
      </div>
    </div>
  );
};

export default PriceRangeFilter;