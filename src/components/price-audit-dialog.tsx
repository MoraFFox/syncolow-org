/** @format */

"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getPriceHistory, PriceAuditEntry } from '@/lib/price-audit';
import { format } from 'date-fns';

interface PriceAuditDialogProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceAuditDialog({ productId, productName, isOpen, onOpenChange }: PriceAuditDialogProps) {
  const [history, setHistory] = useState<PriceAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && productId) {
      setLoading(true);
      getPriceHistory(productId)
        .then(setHistory)
        .finally(() => setLoading(false));
    }
  }, [isOpen, productId]);

  const getPriceChange = (current: number, previous?: number) => {
    if (!previous) return null;
    const change = current - previous;
    if (change > 0) return { type: 'increase', value: change };
    if (change < 0) return { type: 'decrease', value: Math.abs(change) };
    return { type: 'same', value: 0 };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Price History - {productName}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No price history found</div>
          ) : (
            <div className="space-y-3">
              {history.map((entry, index) => {
                const change = getPriceChange(entry.price, history[index + 1]?.price);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${entry.price.toFixed(2)}</span>
                        {change && (
                          <div className="flex items-center gap-1">
                            {change.type === 'increase' && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {change.type === 'decrease' && <TrendingDown className="h-4 w-4 text-red-500" />}
                            {change.type === 'same' && <Minus className="h-4 w-4 text-gray-500" />}
                            {change.value > 0 && (
                              <span className={`text-sm ${change.type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                                ${change.value.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    <Badge variant={entry.source === 'import' ? 'secondary' : 'default'}>
                      {entry.source}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}