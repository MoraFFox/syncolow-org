"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { useDrillDownStore } from "@/store/use-drilldown-store";
import { DrillKind, DrillPayload, DrillMode, DATA_DRILL_KIND, DATA_DRILL_PAYLOAD, DATA_DRILL_MODE, DATA_DRILL_DISABLED } from "@/lib/drilldown-types";

interface DrillTargetProps extends React.HTMLAttributes<HTMLDivElement> {
  kind: DrillKind;
  payload: DrillPayload;
  mode?: DrillMode;
  asChild?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'subtle';
  showIcon?: boolean;
  /** Custom aria-label for screen readers. Defaults to kind + name/id */
  ariaLabel?: string;
}

/**
 * Generates accessible label from payload
 */
function getAccessibleLabel(kind: DrillKind, payload: DrillPayload): string {
  const entityName = (payload as { name?: string }).name
    || (payload as { id?: string }).id
    || (payload as { value?: string }).value
    || 'item';

  const kindLabels: Record<DrillKind, string> = {
    order: 'Order',
    product: 'Product',
    company: 'Company',
    revenue: 'Revenue',
    maintenance: 'Maintenance record',
    inventory: 'Inventory',
    customer: 'Customer',
    barista: 'Barista',
    branch: 'Branch',
    manufacturer: 'Manufacturer',
    category: 'Category',
    feedback: 'Feedback',
    notification: 'Notification',
    payment: 'Payment',
  };

  return `View ${kindLabels[kind] || kind}: ${entityName}`;
}

/**
 * DrillTarget Component
 * 
 * Wraps any element to make it a drilldown target. This component now uses data attributes
 * which are handled by the GlobalDrillListener for a unified drilldown experience.
 * 
 * Accessibility Features:
 * - Screen reader announcements for entity type and name
 * - Keyboard navigation (Enter/Space to activate)
 * - Focus indicators
 * - ARIA attributes for dialog/popup behavior
 * 
 * Usage:
 * <DrillTarget kind="order" payload={{ id: "123", name: "Order #123" }}>
 *   <div>Order #123</div>
 * </DrillTarget>
 * 
 * Or with asChild to avoid wrapper divs:
 * <DrillTarget kind="order" payload={{ id: "123" }} asChild>
 *   <button>View Order</button>
 * </DrillTarget>
 */
export function DrillTarget({
  kind,
  payload,
  mode = 'page',
  asChild = false,
  children,
  className,
  disabled,
  variant,
  showIcon = false,
  ariaLabel,
  expandHitArea,
  hitAreaPadding,
  ...props
}: DrillTargetProps & { expandHitArea?: boolean; hitAreaPadding?: number }) {
  const Comp = asChild ? Slot : "div";
  const { settings } = useDrillDownStore();

  const effectiveVariant = variant || (
    settings.visualStyle === 'prominent' ? 'primary' :
      settings.visualStyle === 'normal' ? 'secondary' :
        'subtle'
  );

  // Determine if expanded hit area should be active (prop overrides setting)
  const isExpandedHitArea = expandHitArea !== undefined ? expandHitArea : settings.expandedHitArea;
  const effectiveHitPadding = hitAreaPadding !== undefined ? hitAreaPadding : settings.hitAreaPadding;

  const accessibleLabel = ariaLabel || getAccessibleLabel(kind, payload);

  // When using asChild with Slot, we must ensure exactly one child element
  // The sr-only elements are not rendered as sibling elements would break Slot
  const content = !asChild && showIcon ? (
    <span className="inline-flex items-center gap-1">
      {children}
      <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
    </span>
  ) : (
    children
  );

  return (
    <Comp
      className={cn(
        "drill-target",
        isExpandedHitArea && "drill-target-expanded",
        !disabled && "cursor-pointer transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !disabled && effectiveVariant === 'primary' && "drill-target-primary",
        !disabled && effectiveVariant === 'secondary' && "drill-target-secondary",
        !disabled && effectiveVariant === 'subtle' && "drill-target-subtle",
        className
      )}
      data-drill-variant={effectiveVariant}
      data-drill-target=""
      {...{ [DATA_DRILL_KIND]: kind }}
      {...{ [DATA_DRILL_PAYLOAD]: JSON.stringify(payload) }}
      {...(mode !== 'page' && { [DATA_DRILL_MODE]: mode })}
      {...(disabled && { [DATA_DRILL_DISABLED]: "" })}
      {...(hitAreaPadding !== undefined && { "data-drill-hit-padding": hitAreaPadding })}
      role="button"
      aria-label={accessibleLabel}
      aria-haspopup="dialog"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          (e.target as HTMLElement).click();
        }
      }}
      style={{
        ...props.style,
        // Set CSS variable for hit padding if expanded
        ...(isExpandedHitArea ? { "--hit-padding": `${effectiveHitPadding}px` } as React.CSSProperties : {})
      }}
      {...props}
    >
      {content}
    </Comp>
  );
}
