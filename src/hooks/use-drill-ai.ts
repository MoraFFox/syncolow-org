"use client";

import { useState, useEffect } from "react";
import { generateDrilldownInsight, DrilldownInsightOutput } from "@/ai/flows/drilldown-insight";
import { DrillKind, DrillPayload } from "@/lib/drilldown-types";
import { logger } from "@/lib/logger";

export function useDrillAI(kind: DrillKind, payload: DrillPayload, data: unknown, isOpen: boolean) {
  const [insight, setInsight] = useState<DrilldownInsightOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !data) {
      setInsight(null);
      return;
    }

    let isMounted = true;
    const fetchInsight = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Safely extract name or id from payload using type narrowing
        const payloadRecord = payload as Record<string, unknown>;
        const entityName = (typeof payloadRecord?.name === 'string' ? payloadRecord.name : null) 
          || (typeof payloadRecord?.id === 'string' ? payloadRecord.id : null) 
          || kind;
        const contextData = JSON.stringify(data).slice(0, 1000); // Truncate to save tokens
        
        const result = await generateDrilldownInsight({
          kind,
          entityName,
          contextData,
        });
        
        if (isMounted) setInsight(result);
      } catch (err) {
        logger.error(err, { component: 'useDrillAI', action: 'generateDrilldownInsight', kind });
        if (isMounted) setError("Failed to generate insight");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Debounce
    const timer = setTimeout(() => {
        fetchInsight();
    }, 500);

    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, [kind, payload, data, isOpen]);

  return { insight, isLoading, error };
}
