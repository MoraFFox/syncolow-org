import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
  className?: string;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ 
  startDate, 
  endDate, 
  onDateChange,
  className = ''
}) => {
 const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // If no start date is selected, set as start date
    if (!startDate) {
      onDateChange(date, endDate);
      return;
    }
    
    // If start date is set but no end date, set as end date
    if (startDate && !endDate) {
      // If the selected date is before the start date, swap them
      if (date < startDate) {
        onDateChange(date, startDate);
      } else {
        onDateChange(startDate, date);
      }
      setOpen(false);
      return;
    }
    
    // If both are set, reset and set as start date
    onDateChange(date, null);
  };

  const resetDates = () => {
    onDateChange(null, null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <span>Date Range</span>
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDates}
            className="h-6 p-1 text-xs"
          >
            Clear
          </Button>
        )}
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? (
              endDate ? (
                `${format(startDate, "LLL dd, y")} - ${format(endDate, "LLL dd, y")}`
              ) : (
                `From ${format(startDate, "LLL dd, y")}`
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate || undefined}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeFilter;