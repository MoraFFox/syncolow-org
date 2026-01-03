# SynergyFlow ERP — Functional Requirements Specification

> **Version:** 1.0.0  
> **Last Updated:** 2025-12-30  
> **Status:** Production-Ready

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [User Roles & Authentication](#3-user-roles--authentication)
4. [Module Specifications](#4-module-specifications)
   - [4.1 Dashboard](#41-dashboard)
   - [4.2 Client Management](#42-client-management)
   - [4.3 Order Management](#43-order-management)
   - [4.4 Product Catalog](#44-product-catalog)
   - [4.5 Payment Management](#45-payment-management)
   - [4.6 Maintenance Management](#46-maintenance-management)
   - [4.7 Analytics & Reporting](#47-analytics--reporting)
   - [4.8 Feedback & Sentiment](#48-feedback--sentiment)
   - [4.9 Notification System](#49-notification-system)
   - [4.10 Settings & Configuration](#410-settings--configuration)
5. [Cross-Cutting Features](#5-cross-cutting-features)
6. [Non-Functional Requirements](#6-non-functional-requirements)

---

## 1. Executive Summary

SynergyFlow ERP is a comprehensive enterprise resource planning system designed for distribution and service-based businesses. The system manages the complete operational lifecycle including:

- **Client Lifecycle**: Company/branch hierarchies, contact management, payment configurations
- **Order Pipeline**: Multi-step order creation, status tracking, bulk operations
- **Product Inventory**: Catalog management, stock tracking, consumption analytics
- **Maintenance Operations**: Visit scheduling, spare parts, service billing
- **Financial Tracking**: Payment scoring, bulk cycles, overdue management
- **Business Intelligence**: Real-time analytics, drilldown exploration, visual exports

### Key Differentiators

| Feature | Description |
|---------|-------------|
| **AI-Powered Notifications** | Smart priority scoring with urgency levels and action suggestions |
| **Offline-First Architecture** | Full functionality during network outages with automatic sync |
| **Drilldown System** | Context-aware data previews on hover/keyboard navigation |
| **Payment Scoring** | Algorithmic client health assessment (0-100 score) |
| **Visual PDF Exports** | Charts and analytics embedded in downloadable reports |

---

## 2. System Overview

### 2.1 Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Dashboard  │  │   Pages     │  │  Service Worker (PWA)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        STATE LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Zustand   │  │ TanStack    │  │   IndexedDB Cache       │  │
│  │   Stores    │  │   Query     │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        API LAYER                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Next.js    │  │   Server    │  │   Distributed Tracing   │  │
│  │  API Routes │  │   Actions   │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Supabase   │  │  Firebase   │  │   Genkit AI             │  │
│  │  (Primary)  │  │(Notifications)│ │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 (Strict Mode) |
| UI Library | shadcn/ui + Radix Primitives |
| Styling | Tailwind CSS 3.4 |
| State | Zustand 4.5 + TanStack Query 5 |
| Database | Supabase (PostgreSQL) + Firebase (Firestore) |
| AI | Genkit + Google GenAI |
| Maps | Google Maps API + Leaflet |
| Charts | Recharts |
| PDF | jsPDF + autoTable |
| Testing | Vitest + Playwright |

---

## 3. User Roles & Authentication

### 3.1 Authentication Flow

| Route | Description |
|-------|-------------|
| `/login` | Email/password authentication via Supabase Auth |
| `/register` | New user registration |
| `/reset-password` | Password recovery flow |
| `/` | Root redirect (→ `/dashboard` if authenticated, → `/login` if not) |

### 3.2 User Session

- **Session Persistence**: JWT tokens stored in secure cookies
- **Profile Management**: `/profile` page for user details
- **Settings Sync**: User preferences stored in Supabase and synced across devices

---

## 4. Module Specifications

### 4.1 Dashboard

**Route:** `/dashboard`

**Purpose:** Central command center providing at-a-glance operational visibility with actionable insights.

#### 4.1.1 KPI Cards (Top Row)

| KPI | Icon | Description | Click Action |
|-----|------|-------------|--------------|
| Scheduled Maintenance Today | Wrench | Count of visits scheduled for today | Navigate to `/maintenance` |
| Deliveries Today | Truck | Count of orders to be delivered today | Navigate to `/orders?status=Pending` |
| Overdue Payments | AlertTriangle | Count of past-due payments | Navigate to `/orders?paymentStatus=Overdue` |
| Low Stock Items | Package | Products below reorder threshold | Navigate to `/products?stock=low` |

#### 4.1.2 Today's Activities Section

| Component | Description |
|-----------|-------------|
| **Today Agenda** | Timeline of scheduled maintenance visits and deliveries |
| **Today Order Log** | Real-time list of orders placed today with status badges |
| **Today Visits Map** | Interactive map showing all scheduled visit locations (Leaflet/Google Maps) |

#### 4.1.3 Key Insights Sidebar

| Component | Description |
|-----------|-------------|
| **Alerts** | Critical notifications: overdue payments, low stock, inactive clients |
| **Activity Feed** | Recent system activities (orders, status changes, payments) |
| **Weekly Lookahead** | Preview of the next 7 days' scheduled activities |

#### 4.1.4 Features

- ✅ Real-time data refresh with loading states
- ✅ Last updated timestamp display
- ✅ Error boundaries around each section
- ✅ Responsive grid layout (1/2/4 columns)
- ✅ Dynamic map loading (SSR disabled)

---

### 4.2 Client Management

**Route:** `/clients` | `/clients/[companyId]`

**Purpose:** Manage hierarchical company/branch structures with comprehensive contact and payment configurations.

#### 4.2.1 Client List Page (`/clients`)

**Views:**
| View | Description |
|------|-------------|
| **List View** | Tabular display with expandable branch rows |
| **Grid View** | Card-based layout for visual browsing |

**Filtering & Sorting:**

| Filter | Options |
|--------|---------|
| Status | Active, Inactive, New |
| Region | All configured regions |
| Payment Status | Excellent, Good, Fair, Poor, Critical |
| Search | Company name, branch name, contacts |

| Sort Field | Direction |
|------------|-----------|
| Name | Asc/Desc |
| Payment Status | Asc/Desc |
| Last 12 Months Revenue | Asc/Desc |

**Actions:**

| Action | Description |
|--------|-------------|
| Add Company | Opens multi-step wizard form |
| Edit Company | Inline edit or full form |
| Delete Company | Confirmation dialog with cascade warning |
| Bulk Delete | Multi-select with confirmation |
| Import CSV | Bulk company creation from file |

#### 4.2.2 Company Wizard Form

**Step 1: Company Details**
- Company name (required)
- Tax number
- Email
- Region assignment
- Area/zone selection
- Industry classification

**Step 2: Location**
- Interactive map picker
- Warehouse location (separate from company)
- Maintenance location classification (Inside Cairo / Outside Cairo / Sahel)

**Step 3: Contacts**
- Multiple contacts per company
- Contact name, position, phone numbers
- Predefined positions: Operation Manager, Branch Manager, Chief, Sales Manager, Owner, Barista

**Step 4: Payment Configuration**
- Payment method: Transfer / Check
- Payment due type:
  - Immediate
  - Days after order (Net 30, 60, etc.)
  - Monthly date
  - Bulk payment schedule

**Step 5: Branches** (Optional)
- Add multiple branches
- Branch-specific contacts
- Branch-specific payment overrides

#### 4.2.3 Company Detail Page (`/clients/[companyId]`)

**Tabs:**
| Tab | Content |
|-----|---------|
| Overview | Company info, key metrics, payment score badge |
| Branches | List of branches with management actions |
| Orders | Order history with filtering |
| Payments | Payment history and outstanding balances |
| Maintenance | Maintenance visit history |
| Baristas | Assigned baristas with ratings |

---

### 4.3 Order Management

**Route:** `/orders` | `/orders/[id]` | `/orders/areas`

**Purpose:** Complete order lifecycle management from creation through delivery and payment.

#### 4.3.1 Order List Page (`/orders`)

**Views:**
| View | Trigger | Description |
|------|---------|-------------|
| Table | Default | Paginated list with sorting and filtering |
| Kanban | Toggle | Drag-and-drop board organized by status |

**Columns:**
| Column | Description |
|--------|-------------|
| Order ID | Unique identifier with drilldown link |
| Client | Company/Branch name |
| Order Date | Date of order creation |
| Delivery Date | Expected delivery |
| Total | Grand total with currency |
| Status | Pending → Processing → Shipped → Delivered |
| Payment | Paid / Pending / Overdue with days overdue |

**Filters:**
| Filter | Options |
|--------|---------|
| Status | Pending, Processing, Shipped, Delivered, Cancelled |
| Payment Status | Paid, Pending, Overdue |
| Date Range | Custom date picker |
| Company/Branch | Autocomplete selector |
| Region/Area | Dropdown selector |

**Bulk Actions:**
| Action | Description |
|--------|-------------|
| Mark Selected Paid | Batch payment recording |
| Update Status | Batch status change |
| Export CSV | Download selected orders |
| Delete Selected | Batch deletion with confirmation |
| Print Today's Orders | Generate printable summary |
| Generate Report | PDF with delivery routes |

#### 4.3.2 Order Creation Wizard

**Step 1: Select Client**
- Search and select existing company/branch
- Or create "Potential Client" (temporary order)

**Step 2: Add Items**
| Field | Description |
|-------|-------------|
| Product | Searchable product picker |
| Quantity | Number input with validation |
| Unit Price | Auto-filled from catalog, editable |
| Tax | Dropdown of configured tax rates |
| Discount | Percentage or fixed amount |

**Step 3: Review & Submit**
- Order summary with calculations:
  - Subtotal = Σ(quantity × price)
  - Item Discounts = Σ(item discounts)
  - Order Discount = percentage or fixed
  - Tax Total = Σ(item taxes)
  - **Grand Total** = Subtotal - Discounts + Tax

- Auto-calculated dates:
  - Delivery date (based on region rules)
  - Payment due date (based on client config)
  - Bulk cycle assignment (if applicable)

#### 4.3.3 Order Detail Page (`/orders/[id]`)

**Sections:**
| Section | Content |
|---------|---------|
| Header | Order ID, status badge, action buttons |
| Client Info | Company/branch details with drilldown |
| Order Items | Table of products with calculations |
| Timeline | Status change history with timestamps |
| Payment Info | Due date, paid date, reference, notes |
| Delivery Info | Scheduled date, notes, driver assignment |

**Actions:**
| Action | Description |
|--------|-------------|
| Edit Order | Modify items, dates, notes |
| Mark Paid | Record payment with reference |
| Update Status | Move through workflow |
| Cancel Order | With reason selection |
| Download Invoice | Generate PDF invoice |
| Duplicate Order | Create copy for same client |

#### 4.3.4 Area Management (`/orders/areas`)

**Purpose:** Geographic organization for delivery routing and analytics.

| Feature | Description |
|---------|-------------|
| Area List | All configured delivery areas |
| Area Stats | Orders count, revenue, active clients per area |
| Area Analytics | Performance metrics by geographic zone |

#### 4.3.5 CSV Import

**Process:**
1. **Upload**: Drag-and-drop or file picker
2. **Column Mapping**: Map CSV columns to order fields
3. **Validation**: Detect blocking vs non-blocking errors
4. **Resolution**: Fix missing entities (companies, products)
5. **Preview**: Review parsed data before import
6. **Import**: Chunk processing with progress bar

**Error Types:**
| Type | Behavior |
|------|----------|
| Blocking | Must be resolved before import (missing required fields) |
| Non-Blocking | Warnings that can be skipped (duplicate detection) |

---

### 4.4 Product Catalog

**Route:** `/products` | `/products/[id]` | `/products/categories` | `/products/manufacturers`

**Purpose:** Product catalog management with inventory tracking and variant support.

#### 4.4.1 Product List Page (`/products`)

**Layout:**
- Top: Category strip (horizontal filter)
- Left: Manufacturer cards (vertical filter)
- Main: Product grid with infinite scroll

**Product Card:**
| Element | Description |
|---------|-------------|
| Image | Product image or AI-generated placeholder |
| Name | Product name with variant suffix |
| Price | Formatted currency |
| Stock | Level with color-coded badge |
| Actions | Edit, Delete, Quick Add to Order |

**Filters:**
| Filter | Description |
|--------|-------------|
| Category | Single select from strip |
| Manufacturer | Multi-select from cards |
| Search | Fuzzy search on name/SKU |
| Stock Level | Low / Medium / High |
| Price Range | Min-max slider |

**Sorting:**
| Option | Description |
|--------|-------------|
| Name A-Z | Alphabetical |
| Price Low-High | Price ascending |
| Stock Low-High | Inventory ascending |
| Best Sellers | Total sold descending |

#### 4.4.2 Product Form

| Field | Type | Required |
|-------|------|----------|
| Name | Text | ✅ |
| Description | Textarea | ❌ |
| Price | Currency | ✅ |
| Stock Level | Number | ✅ |
| SKU | Text | ❌ |
| Category | Dropdown | ❌ |
| Manufacturer | Dropdown | ❌ |
| Image | File upload or AI generation | ❌ |
| Variant Name | Text (for variants) | ❌ |
| Parent Product | Dropdown (for variants) | ❌ |

**AI Image Generation:**
- Text prompt input ("Coffee beans, premium roast, 1kg bag")
- Generates product images via Genkit AI

#### 4.4.3 Categories (`/products/categories`)

| Feature | Description |
|---------|-------------|
| Category List | All product categories |
| Add Category | Simple name input |
| Edit Category | Inline rename |
| Delete Category | With product reassignment option |
| Category Analytics | Product count, revenue contribution |

#### 4.4.4 Manufacturers (`/products/manufacturers`)

| Feature | Description |
|---------|-------------|
| Manufacturer List | Cards with icon and color |
| Add Manufacturer | Name, icon, brand color |
| Edit Manufacturer | All fields editable |
| Delete Manufacturer | With product reassignment |
| Product Count | Number of products per manufacturer |

---

### 4.5 Payment Management

**Route:** `/payments` | `/payments/history`

**Purpose:** Payment tracking, bulk cycle management, and overdue collection.

#### 4.5.1 Payment Dashboard (`/payments`)

**Summary Cards:**
| Card | Metric |
|------|--------|
| Total Outstanding | Sum of all unpaid order totals |
| Overdue Amount | Sum of orders past due date |
| Orders Pending | Count of unpaid orders |
| Bulk Cycles Due | Count of upcoming bulk payment dates |

**Unpaid Orders Table:**
| Column | Description |
|--------|-------------|
| Client | Company/branch name with drilldown |
| Order ID | Link to order detail |
| Amount | Order grand total |
| Due Date | Expected payment date |
| Days Overdue | Calculated from today |
| Payment Score | 0-100 score with color badge |
| Actions | Mark Paid, View Invoice, Payment History |

**Bulk Payment Cycles:**
- Orders grouped by bulk payment date
- Cycle total displayed
- "Mark Cycle Paid" action for batch payment
- Reference and notes input

**Actions:**
| Action | Description |
|--------|-------------|
| Mark as Paid | Opens dialog for date/reference/notes |
| Bulk Mark Paid | Selected orders batch payment |
| Download Invoice | PDF invoice generation |
| View Payment History | Opens history sheet for client |
| Export | CSV export of unpaid orders |

#### 4.5.2 Payment History (`/payments/history`)

**Purpose:** View all completed payments with filtering.

**Columns:**
| Column | Description |
|--------|-------------|
| Client | Company/branch |
| Order ID | Original order reference |
| Amount | Paid amount |
| Paid Date | Date payment was recorded |
| Reference | Payment reference number |
| Marked By | User who recorded payment |
| Notes | Payment notes |

**Filters:**
| Filter | Description |
|--------|-------------|
| Date Range | Payment date range |
| Client | Company/branch selector |
| Amount Range | Min-max filter |

#### 4.5.3 Payment Scoring Algorithm

```
Payment Score = 100 - (Days Overdue × Decay Rate)

Where:
- Grace Period: 7 days (no penalty)
- Decay Rate: ~1.5 points per day
- Minimum Score: 0
- Score calculated from expected payment date
```

**Status Thresholds:**
| Score | Status | Color |
|-------|--------|-------|
| 80-100 | Excellent | Green |
| 60-79 | Good | Blue |
| 40-59 | Fair | Yellow |
| 20-39 | Poor | Orange |
| 0-19 | Critical | Red |

---

### 4.6 Maintenance Management

**Route:** `/maintenance` | `/maintenance/crew` | `/maintenance/services`

**Purpose:** Schedule and track maintenance visits with service billing and spare parts management.

#### 4.6.1 Maintenance List (`/maintenance`)

**Tabs:**
| Tab | Content |
|-----|---------|
| All Visits | Complete list with filtering |
| Scheduled | Upcoming visits |
| In Progress | Active visits |
| Completed | Finished visits |
| Follow-ups | Visits requiring follow-up |

**Filters:**
| Filter | Description |
|--------|-------------|
| Status | Scheduled, In Progress, Completed, Cancelled |
| Date Range | Visit date range |
| Client | Company/branch selector |
| Technician | Assigned employee |
| Resolution | Solved, Partial, Not Solved, Waiting Parts |

**Visit Card/Row:**
| Field | Description |
|-------|-------------|
| Visit ID | Unique identifier |
| Client | Company/branch name |
| Scheduled Date | Planned visit date |
| Actual Date | When technician arrived |
| Status | Current visit status |
| Resolution | Outcome of visit |
| Cost | Total visit cost |

#### 4.6.2 Schedule Visit Form

| Field | Description |
|-------|-------------|
| Client | Company/branch selector |
| Scheduled Date | Date picker |
| Visit Type | Customer Request / Periodic / Follow-up |
| Technician | Employee selector |
| Barista | Assigned barista |
| Notes | Visit instructions |

#### 4.6.3 Record Outcome Form

| Section | Fields |
|---------|--------|
| Arrival | Actual arrival date |
| Problem | Description of issue |
| Resolution | Solved / Partial / Not Solved / Waiting Parts |
| Non-Resolution Reason | If not fully solved |
| Spare Parts | List with name, quantity, price, paid by |
| Services | List with name, cost, paid by |
| Labor | Hours and cost |
| Report | Optional report generation |
| Signature | Client signature capture |
| Supervisor | Witness name |

#### 4.6.4 Crew Management (`/maintenance/crew`)

| Feature | Description |
|---------|-------------|
| Employee List | All maintenance technicians |
| Add Employee | Name, phone, email |
| Edit Employee | Update contact info |
| Delete Employee | With visit reassignment |
| Performance Metrics | Visits completed, resolution rate |

#### 4.6.5 Services (`/maintenance/services`)

| Feature | Description |
|---------|-------------|
| Service Catalog | Predefined services with pricing |
| Add Service | Name, base cost |
| Edit Service | Update pricing |
| Service Usage | Analytics on service utilization |

---

### 4.7 Analytics & Reporting

**Route:** `/analytics` | `/analytics/cancellation` | `/analytics/notifications` | `/analytics/revenue` | `/payment-analytics`

**Purpose:** Business intelligence with interactive charts, drilldowns, and visual exports.

#### 4.7.1 Main Analytics Page (`/analytics`)

**Controls:**
| Control | Description |
|---------|-------------|
| Date Range | Preset (7/14/30/90 days) or custom |
| Sales Account | Filter by sales representative |
| Category | Filter by product category |

**Metrics Grid:**
| Metric | Description |
|--------|-------------|
| Total Revenue | Sum of order totals in period |
| Total Orders | Count of orders in period |
| Average Order Value | Revenue / Orders |
| Active Clients | Unique clients with orders |
| Collection Rate | Paid / Total revenue |

**Charts:**
| Chart | Type | Data |
|-------|------|------|
| Revenue Trend | Area Chart | Daily/weekly revenue over time |
| Orders by Status | Pie/Donut | Distribution across statuses |
| Payment Status | Pie/Donut | Paid vs Pending vs Overdue |
| Top Clients | Bar Chart | Revenue by client |
| Top Products | Bar Chart | Revenue by product |
| Category Breakdown | Treemap | Revenue by category |

**Features:**
- ✅ Drilldown on chart elements (click to filter)
- ✅ Sales account selector for rep-specific analytics
- ✅ Visual export to PDF with embedded charts
- ✅ Export data to CSV/Excel
- ✅ Responsive layout with collapsible sections

#### 4.7.2 Cancellation Analytics (`/analytics/cancellation`)

| Metric | Description |
|--------|-------------|
| Total Cancellations | Count of cancelled orders |
| Cancellation Rate | % of orders cancelled |
| Revenue Lost | Sum of cancelled order values |
| Reasons Distribution | Chart of cancellation reasons |
| Client Analysis | Clients with highest cancellation rates |

#### 4.7.3 Notification Analytics (`/analytics/notifications`)

| Metric | Description |
|--------|-------------|
| Total Notifications | Count over period |
| By Priority | Critical / Warning / Info distribution |
| Response Time | Average time to acknowledge |
| Action Rate | % of notifications with actions taken |
| Engagement Trends | Notifications over time |

#### 4.7.4 Revenue Analytics (`/analytics/revenue`)

| Feature | Description |
|---------|-------------|
| Revenue Trends | Line chart over time |
| By Category | Revenue breakdown |
| By Manufacturer | Revenue breakdown |
| Growth Rates | Period-over-period comparisons |
| Forecasting | AI-powered revenue predictions |

#### 4.7.5 Payment Analytics (`/payment-analytics`)

| Feature | Description |
|---------|-------------|
| Outstanding Overview | Total, overdue, upcoming |
| Client Risk Scores | Ranked by payment score |
| Collection Velocity | Days to payment trends |
| Aging Report | Buckets (0-30, 31-60, 61-90, 90+) |

---

### 4.8 Feedback & Sentiment

**Route:** `/feedback` | `/feedback/submit`

**Purpose:** Collect and analyze customer feedback with AI-powered sentiment analysis.

#### 4.8.1 Feedback Dashboard (`/feedback`)

**Summary Cards:**
| Card | Metric |
|------|--------|
| Total Feedback | Count of all feedback |
| Average Rating | Mean star rating |
| Positive % | Percentage positive sentiment |
| Response Rate | % of feedback responded to |

**Feedback Table:**
| Column | Description |
|--------|-------------|
| Client | Company/branch with drilldown |
| Rating | 1-5 stars visual |
| Sentiment | Positive / Neutral / Negative badge |
| Message | Feedback text (expandable) |
| Date | Submission date |
| Actions | Respond, Share Link |

**Filters:**
| Filter | Description |
|--------|-------------|
| Rating | Star filter |
| Sentiment | Positive / Neutral / Negative |
| Client | Company selector |
| Date Range | Submission date range |

**Sorting:**
| Option | Description |
|--------|-------------|
| Date | Newest first |
| Rating | Highest/lowest first |
| Client Name | Alphabetical |

#### 4.8.2 Feedback Submission (`/feedback/submit`)

**Public Form:**
| Field | Type |
|-------|------|
| Client ID | Pre-filled from URL |
| Rating | Star selector (1-5) |
| Message | Textarea |
| Submit | Creates feedback record |

**Features:**
- ✅ Shareable link per client
- ✅ AI sentiment analysis on submission
- ✅ Notification generated for new feedback

---

### 4.9 Notification System

**Route:** `/notifications`

**Purpose:** Centralized notification management with AI-powered prioritization.

#### 4.9.1 Notification Types (17 Total)

| Category | Type | Priority |
|----------|------|----------|
| **Payment** | Overdue Payment | Critical |
| **Payment** | Payment Due Soon | Warning |
| **Payment** | Bulk Payment Cycle Due | Info |
| **Inventory** | Stock Depletion Warning | Warning |
| **Inventory** | Sales Velocity Drop | Info |
| **Client** | Client at Risk | Warning |
| **Client** | Low Client Satisfaction | Warning |
| **Order** | Order Status Changed | Info |
| **Order** | Delivery Delay Risk | Warning |
| **Order** | Delivery Failed | Critical |
| **Order** | High Value Order | Info |
| **Order** | Order Cancelled | Info |
| **Maintenance** | Follow-up Required | Warning |
| **Maintenance** | Maintenance Due Soon | Info |
| **Maintenance** | Maintenance Delayed | Warning |
| **Maintenance** | Spare Parts Needed | Warning |
| **Feedback** | New Feedback | Info/Warning |

#### 4.9.2 Notification Center

**Components:**
| Component | Description |
|-----------|-------------|
| Badge | Unread count in header |
| Panel | Expandable notification list |
| Grouping | Similar notifications combined |
| Actions | Mark read, snooze, take action |

**AI Priority Scoring:**
| Factor | Weight |
|--------|--------|
| Base Priority | Type-based (Critical > Warning > Info) |
| Time Sensitivity | Urgency increases with age |
| Financial Impact | Higher amounts = higher priority |
| Client Importance | Based on revenue contribution |
| Related Notifications | Grouped = higher attention |

**Snooze Options:**
- 1 hour
- 4 hours
- 1 day
- 3 days
- 1 week

#### 4.9.3 Delivery Channels

| Channel | Description |
|---------|-------------|
| In-App | Notification center, badges, toasts |
| Email | SendGrid/AWS SES integration |
| Push | Browser push notifications |

#### 4.9.4 Preferences

| Setting | Description |
|---------|-------------|
| Enable/Disable | Per notification type |
| Email Digest | Batch notifications |
| Quiet Hours | No notifications during specified hours |
| Push Permissions | Browser push opt-in |

---

### 4.10 Settings & Configuration

**Route:** `/settings`

**Purpose:** Application customization across appearance, behavior, and integrations.

#### 4.10.1 Settings Sections

**General Settings:**
| Setting | Description |
|---------|-------------|
| Company Name | Organization display name |
| Currency | Default currency (EGP, USD, EUR) |
| Date Format | DD/MM/YYYY, MM/DD/YYYY, etc. |
| Timezone | Application timezone |

**Interface Settings:**
| Setting | Description |
|---------|-------------|
| View Mode | List / Grid preference |
| Pagination Limit | Items per page |
| Orders View | Table / Kanban default |
| Theme | Light / Dark / System |
| Sidebar | Collapsed / Expanded default |

**Notifications & Reports:**
| Setting | Description |
|---------|-------------|
| Notification Types | Enable/disable each type |
| Email Notifications | Delivery preferences |
| Report Scheduling | Automated report generation |

**Sales Accounts:**
| Setting | Description |
|---------|-------------|
| Account List | All sales representatives |
| Add Account | Name, code, details |
| Account Mapping | Assign accounts to orders |

**Integrations:**
| Integration | Description |
|-------------|-------------|
| Google Calendar | Sync maintenance visits |
| Google Tasks | Task management sync |
| Email Service | SendGrid/AWS SES config |
| SMS Service | Twilio configuration |

**Accounting:**
| Setting | Description |
|---------|-------------|
| Tax Rates | Manage tax configurations |
| Payment Terms | Default payment configurations |
| Invoice Settings | PDF template customization |

**System:**
| Setting | Description |
|---------|-------------|
| Cache | Clear application cache |
| Data | Export/import data |
| Logs | View application logs |
| Debug | Developer tools |

---

## 5. Cross-Cutting Features

### 5.1 Drilldown System

**Purpose:** Context-aware data previews on hover or keyboard navigation.

**Trigger Methods:**
| Method | Behavior |
|--------|----------|
| Hover | 300ms delay shows preview |
| Keyboard | Arrow keys navigate, Enter opens |
| Touch | Long press on mobile |

**Entity Previews:**
| Entity | Preview Content |
|--------|-----------------|
| Order | Status, total, client, items summary |
| Company | Contact info, payment score, recent orders |
| Product | Stock, price, sales velocity |
| Maintenance | Status, scheduled date, technician |

### 5.2 Offline Mode

**Capabilities:**
| Feature | Description |
|---------|-------------|
| Read Access | Full browse of cached data |
| Create Orders | Queued for sync |
| Update Status | Optimistic UI updates |
| Conflict Resolution | Server-wins with UI prompts |

**Cache Strategy:**
| Metric | Value |
|--------|-------|
| Stale Time | 5 minutes |
| GC Time | 24 hours |
| Storage | IndexedDB |

### 5.3 Search

**Global Search:**
- Fuzzy matching with Fuse.js
- Cross-entity search (orders, clients, products)
- Recent searches history
- Keyboard shortcut (Cmd/Ctrl + K)

**Advanced Search Dialog:**
- Field-specific filters
- Date range selection
- Boolean operators
- Save search presets

### 5.4 PDF Exports

**Report Types:**
| Report | Content |
|--------|---------|
| Invoice | Order details, items, totals |
| Delivery Report | Route, orders, client contacts |
| Warehouse Report | Stock levels, reorder points |
| Analytics Export | Charts, metrics, trends |

**Visual Exports:**
- Embedded Recharts rendered via html2canvas
- Multi-page support
- Custom headers/footers

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target |
|--------|--------|
| Initial Load | < 3s (LCP) |
| Time to Interactive | < 5s |
| API Response | < 500ms (p95) |
| Offline Sync | < 10s for 100 items |

### 6.2 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Supabase Auth with JWT |
| Authorization | Row Level Security (RLS) |
| Data Encryption | TLS 1.3 in transit |
| Input Validation | Zod schemas |
| XSS Prevention | React's built-in escaping |

### 6.3 Accessibility

| Standard | Compliance |
|----------|------------|
| WCAG | 2.1 AA target |
| Keyboard Navigation | Full support |
| Screen Readers | ARIA attributes |
| Color Contrast | 4.5:1 minimum |

### 6.4 Monitoring

| Aspect | Tool |
|--------|------|
| Error Tracking | Structured logging |
| Performance | Custom metrics collector |
| Distributed Tracing | Correlation IDs |
| Audit Logging | User action trails |

---

## Appendix: Page Route Summary

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Root | Redirect based on auth |
| `/login` | Login | Authentication |
| `/register` | Register | User registration |
| `/reset-password` | Password Reset | Recovery flow |
| `/dashboard` | Dashboard | Command center |
| `/clients` | Clients | Company management |
| `/clients/[companyId]` | Client Detail | Company details |
| `/orders` | Orders | Order management |
| `/orders/[id]` | Order Detail | Order details |
| `/orders/areas` | Areas | Geographic management |
| `/products` | Products | Product catalog |
| `/products/[id]` | Product Detail | Product details |
| `/products/categories` | Categories | Category management |
| `/products/manufacturers` | Manufacturers | Manufacturer management |
| `/payments` | Payments | Outstanding payments |
| `/payments/history` | Payment History | Completed payments |
| `/maintenance` | Maintenance | Visit management |
| `/maintenance/crew` | Crew | Employee management |
| `/maintenance/services` | Services | Service catalog |
| `/analytics` | Analytics | Business intelligence |
| `/analytics/cancellation` | Cancellation | Cancellation analysis |
| `/analytics/notifications` | Notification Analytics | Notification metrics |
| `/analytics/revenue` | Revenue | Revenue analysis |
| `/payment-analytics` | Payment Analytics | Payment metrics |
| `/feedback` | Feedback | Customer feedback |
| `/feedback/submit` | Submit Feedback | Public feedback form |
| `/notifications` | Notifications | Notification center |
| `/settings` | Settings | App configuration |
| `/settings/taxes` | Taxes | Tax management |
| `/settings/sync` | Sync | Data synchronization |
| `/settings/reports` | Reports | Report configuration |
| `/profile` | Profile | User profile |
| `/baristas` | Baristas | Barista management |
| `/visits` | Visits | Visit scheduling |
| `/inventory` | Inventory | Stock management |
| `/sentiment` | Sentiment | Sentiment analysis |
| `/drilldown` | Drilldown | Drilldown demos |
| `/admin` | Admin | Administrative tools |
| `/health` | Health | System health check |

---

**Document End**

*This document is auto-generated based on codebase analysis and reflects the current implementation state of SynergyFlow ERP.*
