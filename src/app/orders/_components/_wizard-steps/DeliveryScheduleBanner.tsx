"use client";

import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';

interface DeliveryScheduleBannerProps {
  schedule: 'A' | 'B';
  show: boolean;
}

function getNextDeliveryDate(schedule: 'A' | 'B'): string {
  const today = new Date();
  const scheduleDays = schedule === 'A' ? [0, 2, 4] : [1, 3, 6];
  
  for (let i = 0; i <= 7; i++) {
    const checkDate = addDays(today, i);
    if (scheduleDays.includes(checkDate.getDay())) {
      return format(checkDate, 'EEEE, MMM d');
    }
  }
  
  return format(today, 'EEEE, MMM d');
}

export function DeliveryScheduleBanner({ schedule, show }: DeliveryScheduleBannerProps) {
  const nextDelivery = getNextDeliveryDate(schedule);

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-500 ease-out border-x border-b rounded-b-md",
        show ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 text-muted-foreground text-xs animate-in slide-in-from-top-1 fade-in duration-500">
        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
        <span>Next delivery: <span className="font-medium text-foreground">{nextDelivery}</span></span>
      </div>
    </div>
  );
}
