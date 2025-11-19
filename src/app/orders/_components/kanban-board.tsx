
"use client";

import { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { Order } from '@/lib/types';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { createPortal } from 'react-dom';

const KANBAN_STATUSES: Order['status'][] = ['Pending', 'Processing', 'Shipped', 'Delivered'];

interface KanbanBoardProps {
  orders: Order[];
  onStatusChange: (orderId: string, status: Order['status']) => void;
}

export function KanbanBoard({ orders, onStatusChange }: KanbanBoardProps) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns = useMemo(() => {
    return KANBAN_STATUSES.map(status => ({
      id: status,
      title: status,
      orders: orders.filter(order => order.status === status),
    }));
  }, [orders]);
  
  const orderIds = useMemo(() => orders.map(o => o.id), [orders]);

  const handleDragStart = (event: DragEndEvent) => {
    const { active } = event;
    const order = orders.find(o => o.id === active.id);
    if(order) setActiveOrder(order);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);
    if (over && active.id !== over.id) {
      const activeContainer = active.data.current?.sortable.containerId;
      const overContainer = over.data.current?.sortable.containerId || over.id;

      if (activeContainer !== overContainer) {
        onStatusChange(active.id as string, overContainer as Order['status']);
      }
    }
  };
  

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} sensors={sensors}>
        <div className="flex gap-6 overflow-x-auto p-1 pb-4">
            <SortableContext items={orderIds}>
            {columns.map(col => (
                <KanbanColumn key={col.id} id={col.id} title={col.title} orders={col.orders} />
            ))}
            </SortableContext>
        </div>
        {createPortal(
            <DragOverlay>
                {activeOrder ? <KanbanCard order={activeOrder} isDragging /> : null}
            </DragOverlay>,
            document.body
        )}
    </DndContext>
  );
}
