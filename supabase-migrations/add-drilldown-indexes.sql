-- Performance indexes for drilldown preview queries

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_orderdate ON orders(orderDate);
CREATE INDEX IF NOT EXISTS idx_orders_status_payment ON orders(id, status, paymentStatus);
CREATE INDEX IF NOT EXISTS idx_orders_company ON orders(companyId);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branchId);

-- Companies table indexes
CREATE INDEX IF NOT EXISTS idx_companies_id ON companies(id);
CREATE INDEX IF NOT EXISTS idx_companies_parent ON companies(parentCompanyId);

-- Maintenance table indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_branch ON maintenance(branchId);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance(scheduledDate);
CREATE INDEX IF NOT EXISTS idx_maintenance_barista ON maintenance(baristaId);

-- Baristas table indexes
CREATE INDEX IF NOT EXISTS idx_baristas_branch ON baristas(branchId);
CREATE INDEX IF NOT EXISTS idx_baristas_id ON baristas(id);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON products(manufacturerId);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(categoryId);

-- Feedback table indexes
CREATE INDEX IF NOT EXISTS idx_feedback_client ON feedback(clientId);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(createdAt DESC);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Down migration (commented out)
/*
DROP INDEX IF EXISTS idx_orders_orderdate;
DROP INDEX IF EXISTS idx_orders_status_payment;
DROP INDEX IF EXISTS idx_orders_company;
DROP INDEX IF EXISTS idx_orders_branch;
DROP INDEX IF EXISTS idx_companies_id;
DROP INDEX IF EXISTS idx_companies_parent;
DROP INDEX IF EXISTS idx_maintenance_branch;
DROP INDEX IF EXISTS idx_maintenance_status;
DROP INDEX IF EXISTS idx_maintenance_date;
DROP INDEX IF EXISTS idx_maintenance_barista;
DROP INDEX IF EXISTS idx_baristas_branch;
DROP INDEX IF EXISTS idx_baristas_id;
DROP INDEX IF EXISTS idx_products_manufacturer;
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_feedback_client;
DROP INDEX IF EXISTS idx_feedback_created;
DROP INDEX IF EXISTS idx_notifications_read;
DROP INDEX IF EXISTS idx_notifications_type;
*/
