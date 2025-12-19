-- Mock Data Schema with Views for CamelCase Support
-- Bypasses PostgREST cache issues by changing relation types (Table -> View)
-- Matches Public Schema via Views

DROP SCHEMA IF EXISTS mock_data CASCADE;
CREATE SCHEMA mock_data;
GRANT USAGE ON SCHEMA mock_data TO postgres, anon, authenticated, service_role;

-- ==========================================
-- 1. Users
-- ==========================================
CREATE TABLE mock_data.users_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  photo_url TEXT,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data.users AS
  SELECT 
    id, 
    email, 
    display_name AS "displayName", 
    photo_url AS "photoURL", 
    role, 
    created_at AS "createdAt", 
    updated_at AS "updatedAt"
  FROM mock_data.users_data;

-- ==========================================
-- 2. Companies & Branches
-- ==========================================
CREATE TABLE mock_data.companies_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  parent_company_id UUID REFERENCES mock_data.companies_data(id),
  is_branch BOOLEAN DEFAULT FALSE,
  location TEXT,
  region TEXT,
  delivery_days INTEGER[],
  area TEXT,
  status TEXT,
  contacts JSONB,
  tax_number TEXT,
  email TEXT,
  manager_name TEXT,
  machine_owned BOOLEAN DEFAULT FALSE,
  machine_leased BOOLEAN DEFAULT FALSE,
  lease_monthly_cost DECIMAL(10, 2),
  maintenance_location TEXT,
  warehouse_location TEXT,
  warehouse_contacts JSONB,
  payment_method TEXT,
  payment_due_type TEXT,
  payment_due_days INTEGER,
  payment_due_date INTEGER,
  bulk_payment_schedule JSONB,
  current_payment_score DECIMAL(5, 2),
  payment_status TEXT,
  total_unpaid_orders INTEGER DEFAULT 0,
  total_outstanding_amount DECIMAL(12, 2) DEFAULT 0,
  pending_bulk_payment_amount DECIMAL(12, 2) DEFAULT 0,
  baristas JSONB, -- Note: Store uses 'baristas' table too? Yes.
  performance_score DECIMAL(5, 2),
  last_12_months_revenue DECIMAL(14, 2),
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data.companies AS
  SELECT
    id,
    name,
    industry,
    parent_company_id AS "parentCompanyId",
    is_branch AS "isBranch",
    location,
    region,
    delivery_days AS "deliveryDays",
    area,
    status,
    contacts,
    tax_number AS "taxNumber",
    email,
    manager_name AS "managerName",
    machine_owned AS "machineOwned",
    machine_leased AS "machineLeased",
    lease_monthly_cost AS "leaseMonthlyCost",
    maintenance_location AS "maintenanceLocation",
    warehouse_location AS "warehouseLocation",
    warehouse_contacts AS "warehouseContacts",
    payment_method AS "paymentMethod",
    payment_due_type AS "paymentDueType",
    payment_due_days AS "paymentDueDays",
    payment_due_date AS "paymentDueDate",
    bulk_payment_schedule AS "bulkPaymentSchedule",
    current_payment_score AS "currentPaymentScore",
    payment_status AS "paymentStatus",
    total_unpaid_orders AS "totalUnpaidOrders",
    total_outstanding_amount AS "totalOutstandingAmount",
    pending_bulk_payment_amount AS "pendingBulkPaymentAmount",
    baristas,
    performance_score AS "performanceScore",
    last_12_months_revenue AS "last12MonthsRevenue",
    is_suspended AS "isSuspended",
    suspension_reason AS "suspensionReason",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM mock_data.companies_data;

-- ==========================================
-- 3. Baristas
-- ==========================================
CREATE TABLE mock_data.baristas_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES mock_data.companies_data(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT,
  rating DECIMAL(2, 1),
  notes TEXT
);

CREATE VIEW mock_data.baristas AS
  SELECT
    id,
    branch_id AS "branchId",
    name,
    phone_number AS "phoneNumber",
    rating,
    notes
  FROM mock_data.baristas_data;

-- ==========================================
-- 4. Products
-- ==========================================
CREATE TABLE mock_data.products_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_variant BOOLEAN DEFAULT FALSE,
  parent_product_id UUID REFERENCES mock_data.products_data(id),
  variant_name TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  sku TEXT,
  hint TEXT,
  manufacturer_id TEXT NOT NULL,
  category TEXT,
  total_sold INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data.products AS
  SELECT
    id,
    name,
    description,
    is_variant AS "isVariant",
    parent_product_id AS "parentProductId",
    variant_name AS "variantName",
    price,
    stock,
    image_url AS "imageUrl",
    sku,
    hint,
    manufacturer_id AS "manufacturerId",
    category,
    total_sold AS "totalSold",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM mock_data.products_data;

-- ==========================================
-- 5. Orders
-- ==========================================
CREATE TABLE mock_data.orders_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES mock_data.companies_data(id),
  branch_id UUID REFERENCES mock_data.companies_data(id),
  company_name TEXT,
  branch_name TEXT,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  delivery_date TIMESTAMP WITH TIME ZONE,
  delivery_schedule TEXT,
  payment_due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  total_tax DECIMAL(12, 2) DEFAULT 0,
  discount_type TEXT,
  discount_value DECIMAL(10, 2),
  discount_amount DECIMAL(12, 2),
  grand_total DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2),
  delivery_notes TEXT,
  status_history JSONB,
  items JSONB,
  is_potential_client BOOLEAN DEFAULT FALSE,
  temporary_company_name TEXT,
  temporary_branch_name TEXT,
  import_hash TEXT,
  cancellation_reason TEXT,
  cancellation_notes TEXT,
  area TEXT,
  expected_payment_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  is_paid BOOLEAN DEFAULT FALSE,
  days_overdue INTEGER DEFAULT 0,
  payment_score DECIMAL(5, 2),
  bulk_payment_cycle_id TEXT,
  payment_reference TEXT,
  payment_marked_by TEXT,
  payment_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data.orders AS
  SELECT
    id,
    company_id AS "companyId",
    branch_id AS "branchId",
    company_name AS "companyName",
    branch_name AS "branchName",
    order_date AS "orderDate",
    delivery_date AS "deliveryDate",
    delivery_schedule AS "deliverySchedule",
    payment_due_date AS "paymentDueDate",
    status,
    payment_status AS "paymentStatus",
    subtotal,
    total_tax AS "totalTax",
    discount_type AS "discountType",
    discount_value AS "discountValue",
    discount_amount AS "discountAmount",
    grand_total AS "grandTotal",
    total,
    delivery_notes AS "deliveryNotes",
    status_history AS "statusHistory",
    items,
    is_potential_client AS "isPotentialClient",
    temporary_company_name AS "temporaryCompanyName",
    temporary_branch_name AS "temporaryBranchName",
    import_hash AS "importHash",
    cancellation_reason AS "cancellationReason",
    cancellation_notes AS "cancellationNotes",
    area,
    expected_payment_date AS "expectedPaymentDate",
    paid_date AS "paidDate",
    is_paid AS "isPaid",
    days_overdue AS "daysOverdue",
    payment_score AS "paymentScore",
    bulk_payment_cycle_id AS "bulkPaymentCycleId",
    payment_reference AS "paymentReference",
    payment_marked_by AS "paymentMarkedBy",
    payment_notes AS "paymentNotes",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM mock_data.orders_data;

-- ==========================================
-- 6. Maintenance
-- ==========================================
CREATE TABLE mock_data.maintenance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES mock_data.companies_data(id),
  company_id UUID REFERENCES mock_data.companies_data(id),
  branch_name TEXT,
  company_name TEXT,
  date TIMESTAMP WITH TIME ZONE,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  resolution_date TIMESTAMP WITH TIME ZONE,
  actual_arrival_date TIMESTAMP WITH TIME ZONE,
  technician_name TEXT,
  visit_type TEXT,
  status TEXT,
  maintenance_notes TEXT,
  barista_id TEXT,
  barista_name TEXT,
  barista_recommendations TEXT,
  problem_occurred BOOLEAN,
  problem_reason TEXT[],
  resolution_status TEXT,
  non_resolution_reason TEXT,
  spare_parts JSONB,
  services JSONB,
  costs DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  labor_cost DECIMAL(10, 2),
  delay_days INTEGER,
  delay_reason TEXT,
  is_significant_delay BOOLEAN,
  average_delay_days DECIMAL(5,2),
  resolution_time_days DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data.maintenance AS
  SELECT
    id,
    branch_id AS "branchId",
    company_id AS "companyId",
    branch_name AS "branchName",
    company_name AS "companyName",
    date,
    scheduled_date AS "scheduledDate",
    resolution_date AS "resolutionDate",
    actual_arrival_date AS "actualArrivalDate",
    technician_name AS "technicianName",
    visit_type AS "visitType",
    status,
    maintenance_notes AS "maintenanceNotes",
    barista_id AS "baristaId",
    barista_name AS "baristaName",
    barista_recommendations AS "baristaRecommendations",
    problem_occurred AS "problemOccurred",
    problem_reason AS "problemReason",
    resolution_status AS "resolutionStatus",
    non_resolution_reason AS "nonResolutionReason",
    spare_parts AS "spareParts",
    services,
    costs,
    total_cost AS "totalCost",
    labor_cost AS "laborCost",
    delay_days AS "delayDays",
    delay_reason AS "delayReason",
    is_significant_delay AS "isSignificantDelay",
    average_delay_days AS "averageDelayDays",
    resolution_time_days AS "resolutionTimeDays",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM mock_data.maintenance_data;

-- ==========================================
-- 7. Areas
-- ==========================================
CREATE TABLE mock_data.areas_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  delivery_schedule TEXT
);

CREATE VIEW mock_data.areas AS
  SELECT
    id,
    name,
    delivery_schedule AS "deliverySchedule"
  FROM mock_data.areas_data;

-- ==========================================
-- 8. Returns
-- ==========================================
CREATE TABLE mock_data.returns_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES mock_data.orders_data(id),
  return_date TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data.returns AS
  SELECT
    id,
    order_id AS "orderId",
    return_date AS "returnDate",
    reason,
    status,
    created_at,
    updated_at
  FROM mock_data.returns_data;

-- ==========================================
-- 9. Notifications
-- ==========================================
CREATE TABLE mock_data.notifications_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  read BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES mock_data.users_data(id),
  type TEXT,
  priority TEXT,
  title TEXT,
  message TEXT,
  icon TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  snoozed_until TIMESTAMP WITH TIME ZONE,
  is_group BOOLEAN DEFAULT FALSE,
  items JSONB,
  action_type TEXT,
  entity_id UUID,
  link TEXT,
  data JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  action_taken_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE VIEW mock_data.notifications AS
  SELECT
    id,
    read,
    user_id AS "userId",
    type,
    priority,
    title,
    message,
    icon,
    source,
    created_at AS "createdAt",
    snoozed_until AS "snoozedUntil",
    is_group AS "isGroup",
    items,
    action_type AS "actionType",
    entity_id AS "entityId",
    link,
    data,
    read_at AS "readAt",
    action_taken_at AS "actionTakenAt",
    expires_at AS "expiresAt"
  FROM mock_data.notifications_data;

-- ==========================================
-- 10. User Settings
-- ==========================================
CREATE TABLE mock_data.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_enabled BOOLEAN DEFAULT FALSE,
  email_address TEXT,
  digest_frequency TEXT CHECK (digest_frequency IN ('disabled', 'daily', 'weekly')),
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  notification_types JSONB,
  view_mode TEXT,
  orders_view_mode TEXT CHECK (orders_view_mode IN ('list', 'grid')),
  pagination_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 11. Visits
-- ==========================================
CREATE TABLE mock_data.visits_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES mock_data.companies_data(id),
  client_name TEXT,
  date TIMESTAMP WITH TIME ZONE,
  type TEXT,
  outcome TEXT,
  distance DECIMAL(10, 2),
  address TEXT,
  status TEXT
);

CREATE VIEW mock_data.visits AS
  SELECT
    id,
    client_id AS "clientId",
    client_name AS "clientName",
    date,
    type,
    outcome,
    distance,
    address,
    status
  FROM mock_data.visits_data;

-- ==========================================
-- 12. Feedback
-- ==========================================
CREATE TABLE mock_data.feedback_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES mock_data.companies_data(id),
  feedback_date TIMESTAMP WITH TIME ZONE,
  message TEXT,
  rating INTEGER,
  sentiment TEXT
);

CREATE VIEW mock_data.feedback AS
  SELECT
    id,
    client_id AS "clientId",
    feedback_date AS "feedbackDate",
    message,
    rating,
    sentiment
  FROM mock_data.feedback_data;

-- ==========================================
-- 13. Maintenance Employees (View Name: maintenanceEmployees)
-- ==========================================
CREATE TABLE mock_data.maintenance_employees_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT
);

CREATE VIEW mock_data."maintenanceEmployees" AS
  SELECT
    id,
    name,
    phone
  FROM mock_data.maintenance_employees_data;

-- ==========================================
-- 14. Cancellation Reasons (View Name: cancellationReasons)
-- ==========================================
CREATE TABLE mock_data.cancellation_reasons_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data."cancellationReasons" AS
  SELECT
    id,
    reason,
    created_at AS "createdAt"
  FROM mock_data.cancellation_reasons_data;

-- ==========================================
-- 15. Manufacturers
-- ==========================================
CREATE TABLE mock_data.manufacturers_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  description TEXT,
  tags TEXT[]
);

CREATE VIEW mock_data.manufacturers AS
  SELECT
    id,
    name,
    icon,
    color,
    description,
    tags
  FROM mock_data.manufacturers_data;

-- ==========================================
-- 16. Categories
-- ==========================================
CREATE TABLE mock_data.categories_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

CREATE VIEW mock_data.categories AS
  SELECT
    id,
    name
  FROM mock_data.categories_data;

-- ==========================================
-- 17. Taxes
-- ==========================================
CREATE TABLE mock_data.taxes_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate DECIMAL(5, 2) NOT NULL
);

CREATE VIEW mock_data.taxes AS
  SELECT
    id,
    name,
    rate
  FROM mock_data.taxes_data;

-- ==========================================
-- 18. Inventory Movements
-- ==========================================
CREATE TABLE mock_data.inventory_movements_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES mock_data.products_data(id),
  type TEXT,
  quantity INTEGER,
  reason TEXT,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data."inventoryMovements" AS
  SELECT
    id,
    product_id AS "productId",
    type,
    quantity,
    reason,
    reference,
    created_at AS "createdAt"
  FROM mock_data.inventory_movements_data;

-- ==========================================
-- 19. Shipments
-- ==========================================
CREATE TABLE mock_data.shipments_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES mock_data.orders_data(id),
  status TEXT,
  tracking_number TEXT,
  carrier TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  actual_delivery TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data.shipments AS
  SELECT
    id,
    order_id AS "orderId",
    status,
    tracking_number AS "trackingNumber",
    carrier,
    estimated_delivery AS "estimatedDelivery",
    actual_delivery AS "actualDelivery",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM mock_data.shipments_data;

-- ==========================================
-- 20. Delivery Attempts
-- ==========================================
CREATE TABLE mock_data.delivery_attempts_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES mock_data.shipments_data(id),
  attempt_date TIMESTAMP WITH TIME ZONE,
  success BOOLEAN,
  notes TEXT,
  driver_name TEXT
);

CREATE VIEW mock_data."deliveryAttempts" AS
  SELECT
    id,
    shipment_id AS "shipmentId",
    attempt_date AS "attemptDate",
    success,
    notes,
    driver_name AS "driverName"
  FROM mock_data.delivery_attempts_data;

-- ==========================================
-- 21. Payments (Transaction Records)
-- ==========================================
CREATE TABLE mock_data.payments_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES mock_data.orders_data(id),
  amount DECIMAL(12, 2),
  date TIMESTAMP WITH TIME ZONE,
  method TEXT,
  status TEXT,
  transaction_id TEXT,
  notes TEXT
);

CREATE VIEW mock_data.payments AS
  SELECT
    id,
    order_id AS "orderId",
    amount,
    date,
    method,
    status,
    transaction_id AS "transactionId",
    notes
  FROM mock_data.payments_data;

-- ==========================================
-- 22. Discounts
-- ==========================================
CREATE TABLE mock_data.discounts_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  type TEXT,
  value DECIMAL(10, 2),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0
);

CREATE VIEW mock_data.discounts AS
  SELECT
    id,
    code,
    type,
    value,
    start_date AS "startDate",
    end_date AS "endDate",
    usage_limit AS "usageLimit",
    used_count AS "usedCount"
  FROM mock_data.discounts_data;

-- ==========================================
-- 23. Refunds
-- ==========================================
CREATE TABLE mock_data.refunds_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES mock_data.payments_data(id),
  order_id UUID REFERENCES mock_data.orders_data(id),
  amount DECIMAL(12, 2),
  reason TEXT,
  status TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data.refunds AS
  SELECT
    id,
    payment_id AS "paymentId",
    order_id AS "orderId",
    amount,
    reason,
    status,
    date
  FROM mock_data.refunds_data;

-- ==========================================
-- 24. Audit Logs
-- ==========================================
CREATE TABLE mock_data.audit_logs_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data."auditLogs" AS
  SELECT
    id,
    user_id AS "userId",
    action,
    entity_type AS "entityType",
    entity_id AS "entityId",
    details,
    ip_address AS "ipAddress",
    created_at AS "createdAt"
  FROM mock_data.audit_logs_data;

-- ==========================================
-- 25. Addresses
-- ==========================================
CREATE TABLE mock_data.addresses_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT,
  entity_id UUID,
  street TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_default BOOLEAN DEFAULT FALSE
);

CREATE VIEW mock_data.addresses AS
  SELECT
    id,
    entity_type AS "entityType",
    entity_id AS "entityId",
    street,
    city,
    state,
    postal_code AS "postalCode",
    country,
    latitude,
    longitude,
    is_default AS "isDefault"
  FROM mock_data.addresses_data;

-- ==========================================
-- 26. Jobs (For Generator Status)
-- ==========================================
CREATE TABLE mock_data.jobs_data (
  id TEXT PRIMARY KEY,
  type TEXT,
  status TEXT,
  progress INTEGER DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE VIEW mock_data.jobs AS
  SELECT
    id,
    type,
    status,
    progress,
    result,
    error,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM mock_data.jobs_data;

GRANT ALL ON ALL TABLES IN SCHEMA mock_data TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA mock_data TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA mock_data TO postgres, anon, authenticated, service_role;
