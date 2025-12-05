-- Optimize Drill-Down System Performance

-- 1. Company Stats View
-- Aggregates financial and operational metrics for companies to avoid expensive joins on hover.
CREATE OR REPLACE VIEW view_drilldown_company_stats AS
SELECT 
  c.id,
  count(o.id) as total_orders,
  COALESCE(sum(o.grand_total), 0) as lifetime_value,
  COALESCE(sum(case when o.payment_status = 'Pending' OR o.payment_status = 'Overdue' then o.grand_total else 0 end), 0) as outstanding_balance,
  max(o.order_date) as last_active
FROM companies c
LEFT JOIN orders o ON c.id = o.company_id
GROUP BY c.id;

-- 2. Product Stats View
-- Calculates sales velocity and stock health.
CREATE OR REPLACE VIEW view_drilldown_product_stats AS
SELECT 
  p.id,
  count(oi.id) as units_sold_30d,
  -- Velocity: Items sold per day over last 30 days
  COALESCE(count(oi.id) FILTER (WHERE o.order_date > (now() - interval '30 days')) / 30.0, 0) as daily_velocity,
  -- Revenue: Total sales last 30 days
  COALESCE(sum(oi.price * oi.quantity) FILTER (WHERE o.order_date > (now() - interval '30 days')), 0) as revenue_30d
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id
GROUP BY p.id;

-- 3. Branch Stats View
-- Aggregates performance metrics for branches.
CREATE OR REPLACE VIEW view_drilldown_branch_stats AS
SELECT 
  b.id,
  count(distinct ba.id) as barista_count,
  count(distinct mv.id) as maintenance_count,
  count(distinct o.id) FILTER (WHERE o.order_date > (now() - interval '30 days')) as recent_order_count
FROM branches b
LEFT JOIN baristas ba ON b.id = ba.branch_id
LEFT JOIN maintenance_visits mv ON b.id = mv.branch_id
LEFT JOIN orders o ON b.id = o.branch_id
GROUP BY b.id;
