/** @format */
"use client";

import { Loader2 } from 'lucide-react';
import { Badge } from './badge';

interface OptimisticStatusBadgeProps {
  isPending?: boolean;
}

export function OptimisticStatusBadge({ isPending }: OptimisticStatusBadgeProps) {
  if (!isPending) return null;

  return (
    <Badge variant="secondary" className="gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      Saving...
    </Badge>
  );
}
