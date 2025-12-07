"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ArrowRight, Sparkles, TrendingUp, AlertTriangle, Info, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationInsight } from '@/lib/notification-insights';
import { getInsightIcon, getInsightColor } from '@/lib/notification-insights';
import Link from 'next/link';

interface AIInsightsPanelProps {
  insights: NotificationInsight[];
  onActionClick?: (insight: NotificationInsight) => void;
}

export function AIInsightsPanel({ insights, onActionClick }: AIInsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (insights.length === 0) return null;

  const iconMap: Record<string, React.ElementType> = {
    TrendingUp, AlertTriangle, Info, Target, Zap, Sparkles
  };

  const Icon = ({ name }: { name: string }) => {
    const LucideIcon = iconMap[name] || Info;
    return <LucideIcon className="h-4 w-4" />;
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Insights</CardTitle>
              <p className="text-xs text-muted-foreground">
                {insights.length} insight{insights.length !== 1 ? 's' : ''} detected
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-lg border transition-all hover:shadow-md",
                getInsightColor(insight.severity)
              )}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-background/50">
                  <Icon name={getInsightIcon(insight.type)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {insight.type}
                    </Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-3">
                    {insight.description}
                  </p>
                  <div className="flex items-center gap-2">
                    {insight.metric !== undefined && (
                      <Badge variant="secondary" className="font-mono">
                        {insight.metric}
                      </Badge>
                    )}
                    {insight.change !== undefined && (
                      <Badge 
                        variant={insight.change > 0 ? "destructive" : "default"}
                        className="font-mono"
                      >
                        {insight.change > 0 ? '+' : ''}{insight.change.toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {insight.action && (
                <div className="mt-3 pt-3 border-t border-current/10">
                  {insight.actionLink ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between"
                      asChild
                    >
                      <Link href={insight.actionLink}>
                        {insight.action}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => onActionClick?.(insight)}
                    >
                      {insight.action}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
