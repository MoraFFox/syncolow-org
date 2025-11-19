
"use client";

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Order } from '@/lib/types';
import { KanbanCard } from './kanban-card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KanbanColumnProps {
  id: string;
  title: string;
  orders: Order[];
}

export function KanbanColumn({ id, title, orders }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="flex flex-col w-72 md:w-80 flex-shrink-0">
      <div className="p-3 bg-muted rounded-t-lg">
        <h3 className="font-semibold">{title} <span className="text-sm text-muted-foreground">({orders.length})</span></h3>
      </div>
      <ScrollArea className="flex-1 bg-muted/30 rounded-b-lg border" ref={setNodeRef}>
          <div className="p-3 space-y-3">
              <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                  {orders.map(order => (
                    <KanbanCard key={order.id} order={order} />
                  ))}
              </SortableContext>
              {orders.length === 0 && <div className="h-24" />}
          </div>
      </ScrollArea>
    </div>
  );
}
