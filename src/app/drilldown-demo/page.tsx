"use client";

import { DrillTarget } from "@/components/drilldown/drill-target";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function DrilldownDemoPage() {
  return (
    <div className="container mx-auto p-10 space-y-10 max-w-5xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Drill-Down System V2 Demo</h1>
        <p className="text-muted-foreground text-lg">
          Hover over the items below to see the <strong>Adaptive Insight Cards</strong>. 
          Try pressing <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs border">Space</kbd> while hovering to open Peek Mode.
        </p>
      </div>

      {/* CRM Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-blue-600 flex items-center gap-2">
          CRM & Clients
          <span className="text-xs font-normal text-muted-foreground bg-blue-50 px-2 py-0.5 rounded-full">Blue Theme</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">High Value Client</CardTitle></CardHeader>
            <CardContent>
              <DrillTarget kind="company" payload={{ id: "comp-001", name: "TechNova Solutions" }} className="text-lg font-medium hover:underline cursor-pointer">
                TechNova Solutions
              </DrillTarget>
              <div className="text-xs text-muted-foreground mt-1">Health Score: 92/100</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Risk Client</CardTitle></CardHeader>
            <CardContent>
              <DrillTarget kind="company" payload={{ id: "comp-002", name: "Old Town Cafe" }} className="text-lg font-medium hover:underline cursor-pointer">
                Old Town Cafe
              </DrillTarget>
              <div className="text-xs text-muted-foreground mt-1">Outstanding: $4,200</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Feedback</CardTitle></CardHeader>
            <CardContent>
              <DrillTarget kind="feedback" payload={{ id: "fb-123", clientName: "Alice & Co", sentiment: "positive", message: "Great service!" }} className="text-sm italic hover:text-blue-600 cursor-pointer">
                "Technician was very polite..."
              </DrillTarget>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Operations Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-amber-600 flex items-center gap-2">
          Operations & Staff
          <span className="text-xs font-normal text-muted-foreground bg-amber-50 px-2 py-0.5 rounded-full">Amber Theme</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Active Order</CardTitle></CardHeader>
            <CardContent>
              <DrillTarget kind="order" payload={{ id: "ORD-2024-88", total: 1250.00 }} className="text-lg font-mono font-medium hover:underline cursor-pointer">
                #ORD-2024-88
              </DrillTarget>
              <div className="text-xs text-muted-foreground mt-1">Status: Shipped</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Barista Profile</CardTitle></CardHeader>
            <CardContent>
              <DrillTarget kind="barista" payload={{ id: "bar-001", name: "Sarah Jenkins", rating: 4.8 }} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 -ml-1 rounded transition-colors">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">SJ</div>
                <span className="font-medium">Sarah Jenkins</span>
              </DrillTarget>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Maintenance Visit</CardTitle></CardHeader>
            <CardContent>
              <DrillTarget kind="maintenance" payload={{ id: "maint-55", date: new Date().toISOString() }} className="text-sm hover:underline cursor-pointer">
                Scheduled Visit: Downtown Branch
              </DrillTarget>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Inventory Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-600 flex items-center gap-2">
          Inventory & Products
          <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">Slate Theme</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Product Stock</CardTitle></CardHeader>
            <CardContent>
              <DrillTarget kind="product" payload={{ id: "prod-001", name: "Premium Arabica Beans (1kg)", stock: 12 }} className="text-base font-medium hover:text-slate-900 cursor-pointer">
                Premium Arabica Beans
              </DrillTarget>
              <div className="text-xs text-orange-500 mt-1 font-medium">Low Stock Warning</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Manufacturer</CardTitle></CardHeader>
            <CardContent>
              <DrillTarget kind="manufacturer" payload={{ id: "mfr-001", name: "La Marzocco" }} className="text-lg font-bold hover:underline cursor-pointer">
                La Marzocco
              </DrillTarget>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Category Performance</CardTitle></CardHeader>
            <CardContent>
              <DrillTarget kind="category" payload={{ id: "cat-001", name: "Syrups & Flavors" }} className="text-base hover:underline cursor-pointer">
                Syrups & Flavors
              </DrillTarget>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Finance Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-emerald-600 flex items-center gap-2">
          Finance & Analytics
          <span className="text-xs font-normal text-muted-foreground bg-emerald-50 px-2 py-0.5 rounded-full">Green Theme</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Revenue</CardTitle></CardHeader>
            <CardContent>
              <DrillTarget kind="revenue" payload={{ value: "October 2023", amount: 125000 }} className="text-2xl font-bold text-emerald-600 cursor-pointer hover:opacity-80">
                $125,000.00
              </DrillTarget>
              <div className="text-xs text-muted-foreground">Click for trend analysis</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Payment</CardTitle></CardHeader>
            <CardContent>
              <DrillTarget kind="payment" payload={{ id: "pay-99", amount: 4500, companyName: "Starbucks Corp" }} className="flex justify-between items-center p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 border border-transparent hover:border-border transition-all">
                <span className="font-medium">Starbucks Corp</span>
                <span className="font-mono font-bold">$4,500</span>
              </DrillTarget>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}