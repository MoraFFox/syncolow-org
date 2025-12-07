import { NextRequest, NextResponse } from "next/server";
import { DrillKind } from "@/lib/drilldown-types";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyPreview, getProductPreview, getBranchPreview } from "@/lib/drilldown/data-service";
import { logger } from "@/lib/logger";

// Helper to compute health score if not present
function calculateHealthScore(company: any) {
  if (company.currentPaymentScore) return company.currentPaymentScore;
  let score = 100;
  if (company.status !== 'Active') score -= 20;
  if (company.totalOutstandingAmount > 0) score -= 10;
  return Math.max(0, score);
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { kind, payload } = body;
    const id = payload.id;

    let data: any = null;

    // Switch-case to handle different entity fetches
    switch (kind as DrillKind) {
      case "company":
        if (id) {
          data = await getCompanyPreview(id);
        }
        break;

      case "order":
        if (id) {
          const { data: order, error } = await supabaseAdmin
            .from("orders")
            .select("*, items:order_items(*)") 
            .eq("id", id)
            .single();

          if (!error && order) {
            data = {
              id: order.id,
              status: order.status,
              paymentStatus: order.paymentStatus,
              total: order.grandTotal || order.total,
              createdAt: order.orderDate,
              deliveryDate: order.deliveryDate,
              itemsCount: order.items?.length || 0,
              itemsSummary: order.items?.length 
                ? `${order.items.length} items` 
                : "No items info"
            };
          }
        }
        break;

      case "product":
        if (id) {
          data = await getProductPreview(id);
        }
        break;

      case "revenue":
        // Aggregate revenue query
        // For simplicity, we might just fetch order totals for the period
        // Real implementation would be a group_by query
        const { data: revenueOrders } = await supabaseAdmin
          .from("orders")
          .select("grandTotal")
          .gte("orderDate", new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()); // Last 30 days
        
        const totalRev = revenueOrders?.reduce((sum: number, o: { grandTotal?: number }) => sum + (o.grandTotal || 0), 0) || 0;
        
        data = {
          totalRevenue: totalRev,
          trend: 0, // trend calculation requires comparison with previous period
          sparklineData: [10, 20, 15, 30, 25, 40], // Placeholder sparkline
          orderCount: revenueOrders?.length || 0,
          averageOrderValue: revenueOrders?.length ? totalRev / revenueOrders.length : 0,
          topDriver: { name: "Direct Sales", amount: totalRev * 0.8 }
        };
        break;

      case "payment":
        if (id) {
           // Assuming ID passed is an Order ID for payment context, or a payment ID
           const { data: orderP, error: errorP } = await supabaseAdmin
             .from("orders")
             .select("*, company:companies(name)")
             .eq("id", id)
             .single();
           
           if (!errorP && orderP) {
             data = {
               amount: orderP.grandTotal,
               daysToPayment: 0, // Logic needed to diff dates
               unpaidOrdersCount: 0,
               company: { name: orderP.company?.name || "Unknown" },
               order: { grandTotal: orderP.grandTotal, paymentMethod: orderP.paymentMethod }
             };
           }
        }
        break;

      case "maintenance":
        if (id) {
          const { data: visit, error } = await supabaseAdmin
            .from("maintenance_visits")
            .select("*")
            .eq("id", id)
            .single();

          if (!error && visit) {
            data = {
              date: visit.date,
              status: visit.status,
              technicianName: visit.technicianName,
              branchName: visit.branchName,
              totalCost: visit.totalCost,
              costBreakdown: { labor: visit.laborCost || 0, parts: 0 },
              // Mock timeline for now as it's not in standard schema usually
              timeline: [
                  { title: "Requested", time: "09:00 AM", status: "completed" },
                  { title: "Technician Arrived", time: "10:15 AM", status: "completed" },
                  { title: "Service Completed", time: "11:30 AM", status: visit.status === 'Completed' ? "completed" : "pending" },
              ]
            };
          }
        }
        break;

      case "barista":
        if (id) {
          const { data: barista, error } = await supabaseAdmin
            .from("baristas")
            .select("*, branch:branches(name)")
            .eq("id", id)
            .single();

          if (!error && barista) {
            data = {
              name: barista.name,
              rating: barista.rating,
              branchName: barista.branch?.name,
              visitsCount: 0, // Need to aggregate visits
              averageVisitRating: barista.rating,
              nextShift: new Date().toISOString(), // Placeholder
              skills: ["General"]
            };
          }
        }
        break;

      case "branch":
        if (id) {
          data = await getBranchPreview(id);
        }
        break;
        
      case "manufacturer":
        if (id) {
           const { data: mfr, error } = await supabaseAdmin
             .from("manufacturers")
             .select("*")
             .eq("id", id)
             .single();
           if (!error && mfr) {
             data = {
               name: mfr.name,
               productCount: 0, // count products
               revenue: 0,
               topProducts: []
             };
           }
        }
        break;

      case "category":
         // Categories might not have a table, often just a field in products
         // Or a separate table. We'll assume a field in products for now and just return payload name + mock stats
         data = {
            name: payload.name || "Category",
            revenue: 0,
            topProducts: []
         };
         break;

      case "inventory":
         // Aggregate
         const { count: lowStock } = await supabaseAdmin.from("products").select("*", { count: 'exact', head: true }).lt("stock", 10);
         data = {
            lowStockCount: lowStock || 0,
            incomingCount: 0,
            totalValuation: 0,
            skuCount: 0
         };
         break;

      case "customer":
         // Aggregate
         const { count: totalCustomers } = await supabaseAdmin.from("companies").select("*", { count: 'exact', head: true });
         data = {
            totalCustomers: totalCustomers || 0,
            growthRate: 0,
            newCustomers: 0,
            churnRate: 0
         };
         break;
         
      case "notification":
         if(id) {
            const { data: notif } = await supabaseAdmin.from("notifications").select("*").eq("id", id).single();
            if(notif) {
                data = notif;
            }
         }
         break;
         
      case "feedback":
         if(id) {
            const { data: fb } = await supabaseAdmin.from("feedback").select("*").eq("id", id).single();
            if(fb) {
                data = {
                    ...fb,
                    clientName: "Client", // Join needed or fetch
                    sentiment: fb.sentiment || 'neutral'
                };
            }
         }
         break;

      default:
        data = { ...payload };
    }

    if (!data) {
        // Fallback to mock data if DB returns nothing (graceful degradation)
        // Or simple empty state
        return NextResponse.json({ ...payload, note: "Data not found in DB" });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error(error, { component: 'DrillPreviewAPI', action: 'POST' });
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}