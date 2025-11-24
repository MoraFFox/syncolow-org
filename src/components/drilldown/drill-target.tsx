"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { useDrillDown } from "@/hooks/use-drilldown";
import { DrillKind, DrillPayload, DrillMode } from "@/lib/drilldown-types";

interface DrillTargetProps extends React.HTMLAttributes<HTMLDivElement> {
  kind: DrillKind;
  payload: DrillPayload;
  mode?: DrillMode;
  asChild?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}

export function DrillTarget({
  kind,
  payload,
  mode,
  asChild = false,
  children,
  className,
  disabled,
  onClick,
  ...props
}: DrillTargetProps) {
  const { goToDetail, showPreview, hidePreview } = useDrillDown();
  const Comp = asChild ? Slot : "div";

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    // Call original onClick if provided
    onClick?.(e);
    
    if (!e.defaultPrevented) {
      goToDetail(kind, payload, mode);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    showPreview(kind, payload, { x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    hidePreview();
  };

  return (
    <Comp
      className={cn(
        !disabled && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      {...props}
    >
      {children}
    </Comp>
  );
}
