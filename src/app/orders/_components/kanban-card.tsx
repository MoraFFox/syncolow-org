
"use client";

import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Order } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface KanbanCardProps {
  order: Order;
  isDragging?: boolean;
}

const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Paid': return 'default';
      case 'Pending': return 'secondary';
      case 'Overdue': return 'destructive';
      default: return 'outline';
    }
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
};


export function KanbanCard({ order, isDragging }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: order.id,
    data: {
      type: 'Order',
      order,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <Card className={cn(
            "hover:shadow-md hover:bg-card/90 cursor-grab active:cursor-grabbing",
            isDragging && "opacity-50 shadow-2xl z-50 transform scale-105"
        )}>
            <CardContent className="p-3 space-y-2">
                 <Link href={`/orders/${order.id}`} onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm leading-tight hover:underline">{order.companyName || order.temporaryCompanyName}</p>
                        <Badge variant={getStatusVariant(order.paymentStatus || 'Pending')} className="text-xs">
                        {order.paymentStatus || 'Pending'}
                        </Badge>
                    </div>
                </Link>
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs text-muted-foreground">#{order.id.slice(0, 5)} &bull; {format(new Date(order.orderDate), 'MMM d')}</p>
                        <p className="font-bold">{formatCurrency(order.total)}</p>
                    </div>
                    {order.isPotentialClient && <Badge variant="outline">Potential</Badge>}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
