import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { DrillKind } from '@/lib/drilldown-types';

/**
 * Data Service for Drill-Down System
 * Wraps database calls with Next.js caching to ensure high performance.
 */

// Cache tags for revalidation
const CACHE_TAGS = {
  company: 'drill-company',
  product: 'drill-product',
  order: 'drill-order',
  analytics: 'drill-analytics'
};

// 1. Fetch Company Data (Cached 60s)
export const getCompanyPreview = unstable_cache(
  async (id: string) => {
    // Parallel fetch: Basic info + Stats from View
    const [companyResult, statsResult] = await Promise.all([
      supabaseAdmin.from('companies').select('*').eq('id', id).single(),
      supabaseAdmin.from('view_drilldown_company_stats').select('*').eq('id', id).single()
    ]);

    const company = companyResult.data;
    const stats = statsResult.data;

    if (!company) return null;

    return {
      id: company.id,
      name: company.name,
      status: company.status || 'Active',
      tier: company.tier || 'Standard',
      healthScore: calculateHealthScore(company, stats),
      totalSpent: stats?.lifetime_value || 0,
      orderCount: stats?.total_orders || 0,
      outstandingBalance: stats?.outstanding_balance || 0,
      lastActive: stats?.last_active || company.updated_at,
    };
  },
  ['drill-company-preview'],
  { revalidate: 60, tags: [CACHE_TAGS.company] }
);

// 2. Fetch Product Data (Cached 5m)
export const getProductPreview = unstable_cache(
  async (id: string) => {
    const [productResult, statsResult] = await Promise.all([
      supabaseAdmin.from('products').select('*').eq('id', id).single(),
      supabaseAdmin.from('view_drilldown_product_stats').select('*').eq('id', id).single()
    ]);

    const product = productResult.data;
    const stats = statsResult.data;

    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku || 'N/A',
      stock: product.stock,
      price: product.price,
      margin: 30, // Placeholder as cost isn't standard
      velocity: stats?.daily_velocity || 0,
      revenue: stats?.revenue_30d || 0,
      onOrder: 0, // Placeholder
      image: product.imageUrl
    };
  },
  ['drill-product-preview'],
  { revalidate: 300, tags: [CACHE_TAGS.product] }
);

// 3. Fetch Branch Data (Cached 2m)
export const getBranchPreview = unstable_cache(
  async (id: string) => {
    const [branchResult, statsResult] = await Promise.all([
      supabaseAdmin.from('branches').select('*, company:companies(name)').eq('id', id).single(),
      supabaseAdmin.from('view_drilldown_branch_stats').select('*').eq('id', id).single()
    ]);

    const branch = branchResult.data;
    const stats = statsResult.data;

    if (!branch) return null;

    return {
      name: branch.name,
      machineOwned: branch.machineOwned,
      performanceScore: branch.performanceScore || 0,
      baristaCount: stats?.barista_count || 0,
      maintenanceCount: stats?.maintenance_count || 0,
      recentOrderCount: stats?.recent_order_count || 0,
      parentCompanyName: branch.company?.name,
      recentOrders: []
    };
  },
  ['drill-branch-preview'],
  { revalidate: 120, tags: [CACHE_TAGS.company] }
);

// Helper
function calculateHealthScore(company: any, stats: any) {
  if (company.currentPaymentScore) return company.currentPaymentScore;
  let score = 100;
  if (company.status !== 'Active') score -= 20;
  if ((stats?.outstanding_balance || 0) > 1000) score -= 15;
  return Math.max(0, score);
}
