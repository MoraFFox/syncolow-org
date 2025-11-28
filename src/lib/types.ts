

// Core data models for the SynergyFlow application

export interface Tax {
  id: string;
  name: string;
  rate: number; // Stored as a percentage, e.g., 14 for 14%
}

export interface Contact {
  name: string;
  position: string;
  phoneNumbers: { number: string }[];
}

export interface Company {
  id: string;
  name:string;
  industry?: string;
  parentCompanyId?: string | null;
  isBranch: boolean;
  location?: string | null;
  region: 'A' | 'B' | 'Custom';
  deliveryDays?: number[];
  area?: string;
  createdAt: string; // ISO 8601 date string
  status?: 'Active' | 'Inactive' | 'New'; // General business status
  contacts?: Contact[];
  taxNumber?: string;
  email?: string;
  managerName?: string;
  machineOwned: boolean;
  machineLeased?: boolean;
  leaseMonthlyCost?: number;
  maintenanceLocation?: 'inside_cairo' | 'outside_cairo' | 'sahel';
  warehouseLocation?: string | null;
  warehouseContacts?: Contact[];
  // Payment Configuration
  paymentMethod?: 'transfer' | 'check';
  paymentDueType?: 'immediate' | 'days_after_order' | 'monthly_date' | 'bulk_schedule';
  paymentDueDays?: number;
  paymentDueDate?: number;
  bulkPaymentSchedule?: {
    frequency: 'monthly' | 'quarterly' | 'semi-annually' | 'annually' | 'custom';
    dayOfMonth?: number;
    customDates?: string[]; // MM-DD format (e.g., ['01-01', '08-01']) - recurring annually
  };
  // Payment Score (calculated)
  currentPaymentScore?: number;
  paymentStatus?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  totalUnpaidOrders?: number;
  totalOutstandingAmount?: number;
  pendingBulkPaymentAmount?: number;
  baristas?: Partial<Barista>[];
  performanceScore?: number;
  last12MonthsRevenue?: number;
}

export interface Branch {
  id:string;
  companyId: string;
  name: string;
  contacts?: Contact[];
  email: string;
  location: string | null;
  machineOwned: boolean;
  machineLeased?: boolean;
  leaseMonthlyCost?: number;
  performanceScore: number;
  warehouseLocation?: string | null;
  warehouseManager?: string;
  warehousePhone?: string;
  region: 'A' | 'B' | 'Custom';
  deliveryDays?: number[];
  warehouseContacts?: Contact[];
  baristas?: Partial<Barista>[];
  area?: string;
  maintenanceLocation?: 'inside_cairo' | 'outside_cairo' | 'sahel';
}

// Deprecated in favor of the new Company/Branch structure
export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  contactEmail: string;
  phone?: string;
  address?: string;
  warehouseAddress?: string;
  warehouseKeeperName?: string;
  warehouseKeeperPhone?: string;
  businessId?: string;
  taxNumber?: string;
  region: 'A' | 'B' | 'Custom';
  deliveryDays?: number[];
  status: 'Active' | 'Inactive' | 'New';
  manualStatus?: 'Active' | 'Inactive' | 'New';
  joinedDate: string; // ISO 8601 date string
  tags?: string[];
  originatingOrderId?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string; // Base product name like "Espresso Beans"
  description: string;
  isVariant: boolean;
  parentProductId?: string | null;
  variantName?: string | null; // e.g., "Premium Roast", "250g", "Whole Bean"
  price: number;
  stock: number;
  imageUrl: string;
  sku?: string | null;
  hint?: string;
  manufacturerId: string;
  category?: string;
  totalSold?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  tags?: string[];
}

export interface Order {
  id: string;
  companyId: string;
  branchId?: string | null;
  companyName?: string;
  branchName?: string;
  orderDate: string; // ISO 8601 date string
  deliveryDate?: string | null; // ISO 8601 date string
  paymentDueDate?: string | null; // ISO 8601 date string
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Delivery Failed';
  paymentStatus: 'Paid' | 'Pending' | 'Overdue';
  subtotal: number;
  totalTax: number;
  discountType?: 'percentage' | 'fixed' | null;
  discountValue?: number | null;
  discountAmount?: number | null;
  grandTotal: number;
  items: OrderItem[];
  deliveryNotes?: string;
  statusHistory?: { status: Order['status']; timestamp: string }[];
  isPotentialClient?: boolean;
  temporaryCompanyName?: string;
  temporaryBranchName?: string;
  importHash?: string;
  cancellationReason?: string;
  cancellationNotes?: string;
  area?: string;
  // total is deprecated, use grandTotal instead
  total: number;
  // Payment Tracking
  expectedPaymentDate?: string;
  paidDate?: string;
  isPaid?: boolean;
  daysOverdue?: number;
  paymentScore?: number;
  bulkPaymentCycleId?: string; // Groups orders in same payment cycle (format: bulk_YYYY-MM-DD)
  paymentReference?: string; // Payment reference number
  paymentMarkedBy?: string; // User who marked as paid
  paymentNotes?: string; // Additional payment notes
}

export interface OrderItem {
  id: string; // Temporary ID for client-side state
  productId: string;
  productName: string; // Denormalized product name
  quantity: number;
  price: number;
  taxId?: string | null;
  taxRate?: number;
  taxAmount?: number | null;
  discountType?: 'percentage' | 'fixed' | null;
  discountValue?: number | null;
}

export interface Barista {
  id: string;
  branchId: string;
  name: string;
  phoneNumber: string;
  rating: number;
  notes: string;
}

export interface SparePart {
  name: string;
  quantity: number;
  price?: number;
  paidBy: 'Client' | 'Company';
}

export interface MaintenanceService {
    name: string;
    cost: number;
    quantity: number;
    paidBy: 'Client' | 'Company';
}

export interface MaintenanceVisit {
  id: string;
  branchId: string;
  companyId: string;
  branchName: string;
  companyName: string;
  date: string | Date;
  resolutionDate?: string | Date | null;
  scheduledDate?: string | Date; // When visit was supposed to happen
  actualArrivalDate?: string | Date | null;
  delayDays?: number; // Calculated delay in days
  delayReason?: string; // Reason for delay
  isSignificantDelay?: boolean; // > 3 days
  technicianName: string;
  visitType: "customer_request" | "periodic";
  maintenanceNotes: string;
  baristaId?: string;
  baristaName?: string;
  baristaRecommendations?: string;
  problemOccurred?: boolean;
  problemReason?: string[];
  resolutionStatus?: 'solved' | 'partial' | 'not_solved' | 'waiting_parts'; // NEW: Enhanced resolution tracking
  nonResolutionReason?: string; // NEW: Why problem wasn't solved
  refusalReason?: string;
  spareParts?: SparePart[];
  services?: MaintenanceService[];
  overallReport?: string;
  reportSignedBy?: string;
  supervisorWitness?: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'Follow-up Required' | 'Waiting for Parts';
  rootVisitId?: string | null;
  totalVisits?: number;
  totalCost?: number;
  resolutionTimeDays?: number;
  averageDelayDays?: number;
  laborCost?: number;
}


export interface VisitCall {
  id: string;
  clientId: string;
  clientName?: string;
  date: string;
  type: 'Visit' | 'Call';
  outcome: string;
  distance?: number;
  address?: string;
  status?: 'Scheduled' | 'Completed';
}

export interface Invoice {
  id: string;
  orderId: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
}

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  method: 'Credit Card' | 'Bank Transfer' | 'Other';
}

export interface Return {
  id: string;
  orderId: string;
  returnDate: string;
  reason: string;
  status: 'Processing' | 'Completed' | 'Rejected';
}

export interface Feedback {
  id: string;
  clientId: string;
  feedbackDate: string;
  message: string;
  rating: number; // e.g., 1-5
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  source: string;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  displayName?: string | null;
  photoURL?: string | null;
  role: 'Admin' | 'Manager' | 'Sales' | 'Support';
}

export interface Role {
  id: string;
  name: 'Admin' | 'Manager' | 'Sales' | 'Support';
  permissions: string[];
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface MaintenanceEmployee {
    id: string;
    name: string;
    phone: string;
}

export interface DeliveryArea {
  id: string;
  name: string;
  deliverySchedule: 'A' | 'B';
}


export interface CsvRow {
  [key: string]: string;
}

export type ImportableEntityType = 'order' | 'company' | 'product';

export interface ImportRowError {
  rowIndex: number;
  errorType: 'missing-entity' | 'invalid-data';
  errorMessage: string;
  blocking: boolean;
  originalData?: CsvRow;
  resolvedData?: Partial<CsvRow>;
  resolution?: {
    type: 'create-entity';
    entity: ImportableEntityType;
    suggestedData: Record<string, any>;
  };
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount?: number;
  importedTotal?: number;
  importedSubtotal?: number;
  errors: ImportRowError[];
}

export type NotificationType =
  | 'OVERDUE_PAYMENT'
  | 'PAYMENT_DUE_SOON'
  | 'BULK_PAYMENT_CYCLE_DUE'
  | 'STOCK_DEPLETION_WARNING'
  | 'CLIENT_AT_RISK'
  | 'ORDER_STATUS_CHANGED'
  | 'DELIVERY_DELAY_RISK'
  | 'DELIVERY_FAILED'
  | 'HIGH_VALUE_ORDER'
  | 'ORDER_CANCELLED'
  | 'MAINTENANCE_FOLLOW_UP_REQUIRED'
  | 'MAINTENANCE_DUE_SOON'
  | 'MAINTENANCE_DELAYED'
  | 'SPARE_PARTS_NEEDED'
  | 'NEW_FEEDBACK'
  | 'LOW_CLIENT_SATISFACTION'
  | 'SALES_VELOCITY_DROP';

export type NotificationActionType =
  | 'VIEW_ORDER'
  | 'VIEW_CLIENT'
  | 'SCHEDULE_FOLLOW_UP'
  | 'MARK_AS_PAID'
  | 'CONTACT_CLIENT'
  | 'RESCHEDULE_DELIVERY'
  | 'VIEW_MAINTENANCE'
  | 'VIEW_FEEDBACK'
  | 'REORDER_STOCK';

export interface NotificationItem {
  id: string;
  title: string;
  actionType: NotificationActionType;
  entityId: string;
  link: string;
  data?: any;
}

export interface Notification {
  id: string;
  read: boolean;
  userId?: string;
  type: NotificationType;
  priority: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  icon: string;
  source: string;
  createdAt: string;

  snoozedUntil?: string;
  isGroup: boolean;
  items?: NotificationItem[];
  actionType?: NotificationActionType;
  entityId?: string;
  link?: string;
  data?: any;
  readAt?: string;
  actionTakenAt?: string;
  expiresAt?: string;
  metadata?: {
    amount?: number;
    daysUntil?: number;
    clientName?: string;
    orderCount?: number;
    [key: string]: any;
  };
}

export interface CancellationReason {
  id: string;
  reason: string;
  createdAt: string;
}

