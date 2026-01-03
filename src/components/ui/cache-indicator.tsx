"use client";

import { Badge } from '@/components/ui/badge';
import { Database, Signal, SignalLow, SignalMedium, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CacheMetrics } from '@/lib/cache/types';

interface CacheIndicatorProps {
  isFromCache: boolean;
  /** Optional: Show detailed cache metrics */
  metrics?: Partial<CacheMetrics>;
  /** Optional: Data freshness timestamp */
  dataUpdatedAt?: number;
}

/**
 * CacheIndicator Component
 * 
 * Displays cache status and optionally detailed metrics:
 * - Whether data is from cache
 * - Hit rate visualization
 * - Data freshness indicator
 */
export function CacheIndicator({ isFromCache, metrics, dataUpdatedAt }: CacheIndicatorProps) {
  if (!isFromCache) return null;

  // Calculate freshness if we have a timestamp
  const getFreshnessLabel = (): string => {
    if (!dataUpdatedAt) return 'Cached';
    const ageMs = Date.now() - dataUpdatedAt;
    const ageSec = Math.floor(ageMs / 1000);

    if (ageSec < 60) return `${ageSec}s ago`;
    if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`;
    if (ageSec < 86400) return `${Math.floor(ageSec / 3600)}h ago`;
    return `${Math.floor(ageSec / 86400)}d ago`;
  };

  // Calculate hit rate if metrics available
  const getHitRate = (): number | null => {
    if (!metrics) return null;
    const totalHits = (metrics.hits?.memory || 0) + (metrics.hits?.disk || 0);
    const totalRequests = totalHits + (metrics.misses || 0);
    if (totalRequests === 0) return null;
    return Math.round((totalHits / totalRequests) * 100);
  };

  // Get signal icon based on hit rate
  const HitRateIcon = () => {
    const hitRate = getHitRate();
    if (hitRate === null) return <Database className="h-3 w-3" />;
    if (hitRate >= 80) return <Signal className="h-3 w-3 text-green-500" />;
    if (hitRate >= 50) return <SignalMedium className="h-3 w-3 text-yellow-500" />;
    return <SignalLow className="h-3 w-3 text-red-500" />;
  };

  const hitRate = getHitRate();
  const freshnessLabel = getFreshnessLabel();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1.5">
            <HitRateIcon />
            <span className="text-xs">{freshnessLabel}</span>
            {hitRate !== null && (
              <span className="text-xs text-muted-foreground">({hitRate}%)</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p className="font-medium">Cached Data</p>
            {dataUpdatedAt && (
              <p className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Updated: {new Date(dataUpdatedAt).toLocaleString()}
              </p>
            )}
            {metrics && (
              <>
                <p>Memory hits: {metrics.hits?.memory || 0}</p>
                <p>Disk hits: {metrics.hits?.disk || 0}</p>
                <p>Misses: {metrics.misses || 0}</p>
                {hitRate !== null && <p>Hit rate: {hitRate}%</p>}
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
