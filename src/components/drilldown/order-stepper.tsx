"use client";

import * as React from "react";
import { Check, Clock, Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";

interface OrderStepperProps {
  status: OrderStatus;
  className?: string;
}

const steps = [
  { id: "Pending", icon: Clock, label: "Placed" },
  { id: "Processing", icon: Package, label: "Packed" },
  { id: "Shipped", icon: Truck, label: "Shipped" },
  { id: "Delivered", icon: Check, label: "Delivered" },
];

export const OrderStepper = React.memo<OrderStepperProps>(function OrderStepper({ status, className }) {
  const currentStepIndex = steps.findIndex((s) => s.id === status);
  const isCancelled = status === "Cancelled";

  if (isCancelled) {
    return (
      <div className={cn("flex items-center justify-center p-3 bg-red-50 text-red-600 rounded-md font-medium text-sm", className)}>
        Order Cancelled
      </div>
    );
  }

  return (
    <div className={cn("w-full flex justify-between relative", className)}>
      {/* Connector Line */}
      <div className="absolute top-3 left-0 w-full h-0.5 bg-muted -z-10" />
      <div 
        className="absolute top-3 left-0 h-0.5 bg-green-500 -z-10 transition-all duration-500" 
        style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
      />

      {steps.map((step, index) => {
        const isCompleted = index <= currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-[10px] border-2 bg-background transition-colors duration-300",
                isCompleted ? "border-green-500 text-green-500" : "border-muted text-muted-foreground",
                isCurrent && "bg-green-50"
              )}
            >
              <Icon className="h-3 w-3" />
            </div>
            <span 
              className={cn(
                "text-[9px] uppercase font-semibold tracking-tight transition-colors",
                isCompleted ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
});
