"use client";

import { Building, Package, Plus, ShoppingCart, Wrench } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface QuickAddMenuProps {
  onClientClick: () => void;
  onOrderClick: () => void;
  onProductClick: () => void;
  onMaintenanceClick: () => void;
}

export function QuickAddMenu({
  onClientClick,
  onOrderClick,
  onProductClick,
  onMaintenanceClick,
}: QuickAddMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon'>
          <Plus className='h-5 w-5' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={onClientClick}>
          <Building className='mr-2 h-4 w-4' />
          <span>New Company</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOrderClick}>
          <ShoppingCart className='mr-2 h-4 w-4' />
          <span>New Order</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onProductClick}>
          <Package className='mr-2 h-4 w-4' />
          <span>New Product</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onMaintenanceClick}>
          <Wrench className='mr-2 h-4 w-4' />
          <span>New Maintenance</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
