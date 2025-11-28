"use client";

import { DrillTarget } from './drill-target';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface RelatedEntity {
  kind: DrillKind;
  payload: DrillPayload;
  label: string;
  relationship: string;
}

interface RelatedEntitiesSectionProps {
  entities: RelatedEntity[];
  title?: string;
}

export function RelatedEntitiesSection({ entities, title = "Related" }: RelatedEntitiesSectionProps) {
  if (entities.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entities.map((entity, idx) => (
          <DrillTarget key={idx} kind={entity.kind} payload={entity.payload}>
            <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{entity.kind}</Badge>
                <span className="text-sm font-medium">{entity.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{entity.relationship}</span>
            </div>
          </DrillTarget>
        ))}
      </CardContent>
    </Card>
  );
}
