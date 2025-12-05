"use client";

import { DrillTarget } from "./drill-target";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Palette } from "lucide-react";

/**
 * DrilldownVisualLegend Component
 * 
 * A reusable component that displays the three visual variants of DrillTarget
 * with live examples, descriptions, and usage guidance. Can be embedded in
 * help dialogs or settings pages.
 * 
 * Shows primary (prominent), secondary (normal), and subtle variants with
 * their characteristics and when to use them.
 */
export function DrilldownVisualLegend() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Visual Styles</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Primary (Prominent)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Bold solid underline, primary color. Use for main navigation targets, critical entities.
            </p>
            <div className="p-2 bg-muted rounded text-center">
              <DrillTarget
                kind="product"
                payload={{ id: "sample" }}
                disabled
                variant="primary"
                showIcon
              >
                Sample Product
              </DrillTarget>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Secondary (Normal)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Dotted underline, muted color. Use for secondary references, related entities.
            </p>
            <div className="p-2 bg-muted rounded text-center">
              <DrillTarget
                kind="order"
                payload={{ id: "12345" }}
                disabled
                variant="secondary"
                showIcon
              >
                Order #12345
              </DrillTarget>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subtle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              No underline, cursor change only. Use for dense tables, repeated elements to reduce visual noise.
            </p>
            <div className="p-2 bg-muted rounded text-center">
              <DrillTarget
                kind="customer"
                payload={{ id: "ABC" }}
                disabled
                variant="subtle"
                showIcon
              >
                Customer ABC
              </DrillTarget>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        These styles can be customized in{" "}
        <a href="/settings" className="underline">
          settings
        </a>
        , and variants can be overridden per component via the <code>variant</code> prop.
      </p>
    </div>
  );
}