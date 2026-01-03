<!-- @format -->

I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

I've completed a comprehensive review of the dashboard from development, UI, and UX perspectives. The analysis revealed several critical issues:

**Development Issues:**

- Inconsistent data fetching (mixing Supabase direct queries with Zustand stores)
- Over-fetching and client-side filtering in components
- Missing error boundaries
- Hardcoded magic numbers scattered throughout
- Excessive CardHeader duplication

**UI Design Issues:**

- Weak visual hierarchy (header same size as card titles)
- KPI cards lack visual impact
- Inconsistent card padding
- Unprofessional empty states with dashed borders
- Map component lacks polish
- Alert component visual clutter

**UX Issues:**

- Cognitive overload (too much competing information)
- Poor scannability (fixed ScrollArea heights)
- Unclear actionability (can't tell what's clickable)
- No alert prioritization
- Missing quick actions
- No personalization options
- Refresh button placement issues

The implementation plan will address these issues in priority order, starting with critical architectural fixes, then UI improvements, and finally UX enhancements.

### Approach

The implementation will follow a **three-phase approach**:

**Phase 1: Architecture & Data Layer** (Critical)

- Standardize all data fetching to React Query
- Create centralized configuration
- Add error boundaries
- Create reusable wrapper components

**Phase 2: UI Enhancement** (High Priority)

- Improve visual hierarchy and typography
- Enhance KPI cards with better styling
- Polish empty states and alerts
- Reorganize map component

**Phase 3: UX Improvements** (Medium Priority)

- Add priority indicators and quick actions
- Implement section grouping
- Add scroll indicators and timestamps
- Improve interactive element clarity

Each phase builds on the previous one, ensuring the dashboard remains functional throughout the refactoring process.

### Reasoning

I performed a comprehensive analysis of the dashboard by:

1. Reading the main dashboard page and all component files
2. Examining the data fetching hooks and API layer
3. Reviewing the layout structure and global styles
4. Analyzing the design system (Tailwind config, UI components)
5. Identifying patterns, inconsistencies, and improvement opportunities across development, UI, and UX dimensions

## Mermaid Diagram

sequenceDiagram
participant User
participant Page as Dashboard Page
participant Hooks as React Query Hooks
participant API as Dashboard API
participant DB as Supabase
participant Components as Dashboard Components

    User->>Page: Visits Dashboard
    Page->>Hooks: useDashboardMetrics()
    Page->>Hooks: useTodayAgenda()
    Page->>Hooks: useAlerts()

    par Parallel Data Fetching
        Hooks->>API: getMetrics()
        API->>DB: Query KPIs
        DB-->>API: Return counts
        API-->>Hooks: DashboardMetrics

        Hooks->>API: getTodayAgenda()
        API->>DB: Query visits & maintenance
        DB-->>API: Return events
        API-->>Hooks: AgendaItems[]

        Hooks->>API: getAlerts()
        API->>DB: Query overdue, low stock
        DB-->>API: Return alerts
        API-->>Hooks: Alerts
    end

    Hooks-->>Page: All Data Ready
    Page->>Components: Render with data
    Components-->>User: Display Dashboard

    Note over Page,Components: Error Boundary wraps each section
    Note over Hooks,API: Uses DASHBOARD_CONFIG for all constants
    Note over Components: SectionCard, EmptyState, PriorityBadge reused

    User->>Page: Clicks Refresh
    Page->>Hooks: refetch()
    Hooks->>API: Re-fetch all data
    API->>DB: Fresh queries
    DB-->>API: Updated data
    API-->>Hooks: New data
    Hooks-->>Components: Update UI
    Components-->>User: Show refreshed data

## Proposed File Changes

### src\app\dashboard_lib\dashboard-config.ts(NEW)

References:

- src\app\dashboard_lib\dashboard-api.ts(MODIFY)
- src\app\dashboard_lib\kpi.ts(MODIFY)

Create a centralized configuration file for all dashboard constants and magic numbers. This file should export a `DASHBOARD_CONFIG` object containing:

- `STOCK_THRESHOLD`: Low stock threshold (currently hardcoded as 10)
- `ALERT_LIMIT`: Maximum number of alerts to display (currently 5)
- `CACHE_STALE_TIME`: React Query stale time in milliseconds (currently 1000 _ 60 _ 5)
- `REFRESH_INTERVAL`: Auto-refresh interval in milliseconds (currently 1000 _ 60 _ 5)
- `SCROLL_AREA_HEIGHTS`: Object containing standard heights for different scroll areas
- `KPI_CARD_VARIANTS`: Configuration for KPI card styling variants
- `PRIORITY_LEVELS`: Alert priority level definitions

Export as a const assertion for type safety. This eliminates magic numbers scattered across `dashboard-api.ts`, `kpi.ts`, and component files.

### src\app\dashboard_lib\dashboard-api.ts(MODIFY)

References:

- src\app\dashboard_lib\dashboard-config.ts(NEW)

Refactor to use the new `DASHBOARD_CONFIG` constants instead of hardcoded values:

1. Import `DASHBOARD_CONFIG` from `dashboard-config.ts`
2. Replace hardcoded `10` with `DASHBOARD_CONFIG.STOCK_THRESHOLD` in the `getMetrics` function
3. Replace hardcoded `5` with `DASHBOARD_CONFIG.ALERT_LIMIT` in the `getAlerts` function
4. Add a new `getTodayVisits` function that returns only today's visits with coordinates (currently this logic is in the component)
5. Optimize queries to use server-side filtering instead of fetching all data
6. Add proper error handling with try-catch blocks for all API functions
7. Add JSDoc comments documenting each function's purpose and return type

This standardizes the data layer and improves performance by reducing over-fetching.

### src\app\dashboard_hooks\use-dashboard-data.ts(MODIFY)

References:

- src\app\dashboard_lib\dashboard-config.ts(NEW)
- src\app\dashboard_lib\dashboard-api.ts(MODIFY)

Enhance the hooks file with additional hooks and standardized configuration:

1. Import `DASHBOARD_CONFIG` from `dashboard-config.ts`
2. Update all hooks to use `DASHBOARD_CONFIG.CACHE_STALE_TIME` and `DASHBOARD_CONFIG.REFRESH_INTERVAL` instead of hardcoded values
3. Add a new `useTodayVisits` hook that calls `dashboardApi.getTodayVisits` (to replace the Zustand store usage in the map component)
4. Add error handling configuration to all hooks (retry logic, error callbacks)
5. Add `refetchOnWindowFocus: false` to prevent unnecessary refetches
6. Export a `useDashboardData` hook that combines all dashboard queries for easier consumption

This creates a consistent data fetching pattern across all dashboard components.

### src\app\dashboard_components\section-card.tsx(NEW)

References:

- src\components\ui\card.tsx

Create a reusable wrapper component to eliminate CardHeader duplication across all dashboard components. This component should:

1. Accept props: `title`, `description`, `children`, `className`, `headerAction` (optional button/element in header)
2. Render a `Card` with consistent styling
3. Include `CardHeader` with `CardTitle` and `CardDescription`
4. Support optional header actions (like refresh buttons)
5. Include proper TypeScript interfaces
6. Add optional `loading` prop to show skeleton state
7. Support optional `icon` prop to display next to title

This component will be used in `alerts.tsx`, `activity-feed.tsx`, `weekly-lookahead.tsx`, `today-order-log.tsx`, and `today-agenda.tsx` to reduce code duplication.

### src\app\dashboard_components\empty-state.tsx(NEW)

Create a polished, reusable empty state component to replace the current dashed border empty states. The component should:

1. Accept props: `icon` (Lucide icon component), `title`, `description`, `action` (optional button)
2. Render a centered layout with:
   - Circular background container with muted color
   - Icon centered in the circle
   - Title in semibold font
   - Description in muted text
   - Optional action button below
3. Use proper spacing and typography scale
4. Support dark mode with appropriate color adjustments
5. Include TypeScript interfaces

This will replace the empty states in `alerts.tsx`, `activity-feed.tsx`, and `today-agenda.tsx`, providing a more professional appearance.

### src\app\dashboard_components\priority-badge.tsx(NEW)

References:

- src\components\ui\badge.tsx

Create a component for displaying alert priority levels with consistent visual styling:

1. Accept props: `priority` ('critical' | 'high' | 'medium' | 'low'), `className`
2. Define color schemes for each priority level:
   - Critical: Red with urgent label
   - High: Orange
   - Medium: Yellow
   - Low: Gray
3. Render a `Badge` component with appropriate variant and styling
4. Include icons for critical/high priorities (AlertCircle, AlertTriangle)
5. Support dark mode
6. Export priority type and styling utilities for use in other components

This component will be used in the enhanced `alerts.tsx` to visually distinguish alert importance.

### src\app\dashboard_components\error-boundary.tsx(NEW)

Create a dashboard-specific error boundary component to prevent component failures from breaking the entire dashboard:

1. Implement React error boundary using class component or use-error-boundary hook
2. Accept props: `fallback` (optional custom fallback UI), `onError` (optional error callback)
3. Provide a default fallback UI showing:
   - Error icon
   - "Something went wrong" message
   - "Retry" button to reset error state
   - Optional "Report Issue" button
4. Log errors to console in development
5. Support error reporting service integration (placeholder for future)
6. Include TypeScript interfaces

This will wrap major dashboard sections in `page.tsx` to isolate failures.

### src\app\dashboard_components\kpi-card.tsx(MODIFY)

References:

- src\components\ui\badge.tsx
- src\components\ui\skeleton.tsx

Enhance the KPI card component with improved visual design and additional features:

1. **Typography Enhancement**: Increase value font size from `text-2xl` to `text-3xl md:text-4xl` for better prominence
2. **Add Hover Effects**: Enhance hover state with `hover:scale-[1.02]` and `hover:shadow-lg` transitions
3. **Gradient Backgrounds**: Update `variantStyles` to use subtle gradient backgrounds (from-{color}-50 to-{color}-100/50)
4. **Add Trend Support**: Add optional `trend` prop (number) to show percentage change with up/down arrows
5. **Add Sparkline Support**: Add optional `sparklineData` prop to display mini chart below value
6. **Improve Icon Sizing**: Increase icon size from `h-4 w-4` to `h-5 w-5`
7. **Add Loading Animation**: Enhance skeleton loader with pulse animation
8. **Better Spacing**: Adjust CardHeader padding for better visual balance

Import `Badge` component for trend indicators and create a simple `Sparkline` component or use existing chart library.

### src\app\dashboard_components\dashboard-header.tsx(MODIFY)

References:

- src\components\ui\tooltip.tsx

Improve the dashboard header visual hierarchy and prominence:

1. **Increase Heading Size**: Change h1 from `text-3xl` to `text-4xl md:text-5xl` for better visual hierarchy
2. **Enhance Description**: Change description from `text-muted-foreground mt-1` to `text-base md:text-lg text-muted-foreground mt-2`
3. **Add Last Updated Indicator**: Display timestamp showing when dashboard data was last refreshed
4. **Improve Refresh Button**: Add tooltip explaining what gets refreshed
5. **Add Quick Stats Summary**: Optional inline display of critical metrics count (e.g., "3 urgent items")
6. **Better Responsive Layout**: Ensure proper wrapping on mobile devices
7. **Add Animation**: Subtle fade-in animation on mount

Import `Tooltip` component from UI library and `formatDistanceToNow` from date-fns for timestamp display.

### src\app\dashboard_components\alerts.tsx(MODIFY)

References:

- src\app\dashboard_components\section-card.tsx(NEW)
- src\app\dashboard_components\empty-state.tsx(NEW)
- src\app\dashboard_components\priority-badge.tsx(NEW)

Refactor the alerts component with improved UX and visual design:

1. **Replace CardHeader**: Use the new `SectionCard` wrapper component instead of manual CardHeader rendering
2. **Simplify Alert Styling**: Remove excessive backgrounds, use left border accent (border-l-4) instead of full background colors
3. **Add Priority System**: Integrate `PriorityBadge` component and sort alerts by priority
4. **Add Quick Actions**: Include inline action buttons ("Mark Paid", "Reorder", "Dismiss") for each alert type
5. **Improve Empty State**: Replace dashed border empty state with the new `EmptyState` component
6. **Add Filtering**: Optional filter dropdown to show only specific alert types
7. **Better Hover States**: Add `hover:bg-muted/50` transition for better interactivity
8. **Add Timestamps**: Show when each alert was generated
9. **Reduce Skeleton Complexity**: Simplify loading state using consistent skeleton pattern
10. **Add Refresh Indicator**: Show "Updated X minutes ago" in section header

Import `SectionCard`, `EmptyState`, `PriorityBadge` components and update the alert data structure to include priority levels.

### src\app\dashboard_components\activity-feed.tsx(MODIFY)

References:

- src\app\dashboard_components\section-card.tsx(NEW)
- src\app\dashboard_components\empty-state.tsx(NEW)

Refactor the activity feed component for better consistency and UX:

1. **Replace CardHeader**: Use the new `SectionCard` wrapper component
2. **Improve Empty State**: Replace dashed border with the new `EmptyState` component
3. **Add Filtering**: Add filter buttons to show only specific activity types (Orders, Feedback, Clients)
4. **Better Timestamps**: Use more readable relative time format ("2 hours ago" instead of full formatRelative)
5. **Add Activity Icons**: Ensure consistent icon sizing and colors
6. **Improve Card Styling**: Simplify borders and shadows for cleaner appearance
7. **Add Hover Effects**: Enhance hover state with subtle background change
8. **Better Button Styling**: Use icon buttons instead of full text buttons to save space
9. **Add Refresh Indicator**: Show last updated timestamp in section header
10. **Optimize Skeleton Loading**: Use consistent skeleton pattern matching the new design

Import `SectionCard` and `EmptyState` components, and use `formatDistanceToNow` from date-fns for better timestamp formatting.

### src\app\dashboard_components\weekly-lookahead.tsx(MODIFY)

References:

- src\app\dashboard_components\section-card.tsx(NEW)

Refactor the weekly lookahead component for consistency:

1. **Replace CardHeader**: Use the new `SectionCard` wrapper component
2. **Improve Visual Design**: Enhance the stat cards with better spacing and hover effects
3. **Add Trend Indicators**: Show comparison to previous week (up/down arrows with percentage)
4. **Better Icon Styling**: Ensure consistent icon sizing and colors
5. **Add Empty State**: Handle case when no upcoming events exist
6. **Improve Loading State**: Use consistent skeleton pattern
7. **Add Refresh Indicator**: Show last updated timestamp
8. **Better Typography**: Increase font weight for numbers to improve scannability
9. **Add Click Actions**: Make stat cards clickable to navigate to filtered views

Import `SectionCard` component and add Link wrappers for navigation to filtered order/maintenance pages.

### src\app\dashboard_components\today-order-log.tsx(MODIFY)

References:

- src\app\dashboard_components\section-card.tsx(NEW)
- src\components\ui\badge.tsx

Refactor the today's order log component for consistency and better UX:

1. **Replace CardHeader**: Use the new `SectionCard` wrapper component
2. **Improve Empty State**: Add proper empty state message when no deliveries scheduled
3. **Better Card Styling**: Simplify borders and shadows
4. **Add Order Status Badges**: Show order status (Pending, In Progress) with color-coded badges
5. **Improve Button Styling**: Use icon buttons or smaller buttons to save space
6. **Add Scroll Indicator**: Show gradient fade at bottom when content is scrollable
7. **Better Loading State**: Use consistent skeleton pattern
8. **Add Refresh Indicator**: Show last updated timestamp
9. **Add Quick Actions**: Include inline "Mark Delivered" button for quick updates
10. **Optimize Height**: Make ScrollArea height adaptive based on content

Import `SectionCard`, `Badge` components and add scroll indicator logic.

### src\app\dashboard_components\today-agenda.tsx(MODIFY)

References:

- src\app\dashboard_components\empty-state.tsx(NEW)

Refactor the today's agenda component for better consistency:

1. **Remove Manual CardHeader**: This component doesn't use CardHeader, but should be wrapped in a Card for consistency
2. **Improve Empty State**: Replace dashed border with the new `EmptyState` component
3. **Better Card Styling**: Ensure consistent styling with other dashboard cards
4. **Add Time Display**: Show scheduled time for each event (currently missing)
5. **Add Status Indicators**: Show completion status or progress for events
6. **Improve Badge Styling**: Ensure consistent badge usage for event types
7. **Better Loading State**: Use consistent skeleton pattern
8. **Add Filtering**: Allow filtering by event type (Maintenance, Visit)
9. **Add Scroll Indicator**: Show gradient fade when content is scrollable
10. **Improve DrillTarget Integration**: Ensure all events are properly drillable

Import `EmptyState` component and ensure proper Card wrapper for consistency with other sections.

### src\app\dashboard_components\today-visits-map.tsx(MODIFY)

References:

- src\app\dashboard_hooks\use-dashboard-data.ts(MODIFY)
- src\app\dashboard_components\empty-state.tsx(NEW)

Refactor the map component for better UX and performance:

1. **Replace Data Source**: Use the new `useTodayVisits` hook instead of Zustand stores to eliminate over-fetching
2. **Reorganize Controls**: Move the visit selector dropdown ABOVE the map for better visual flow
3. **Improve Button Placement**: Move "Zoom to Fit" button to CardHeader as a header action
4. **Add Map Controls**: Include zoom in/out buttons and current location button
5. **Adaptive Height**: Make map height responsive (min-h-[400px] max-h-[600px]) instead of fixed 400px
6. **Better Loading State**: Show skeleton with map placeholder instead of generic skeleton
7. **Improve InfoWindow**: Enhance styling with better typography and spacing
8. **Add Visit Count Badge**: Show total visits count in CardHeader
9. **Better Empty State**: Use proper empty state component when no visits
10. **Add Refresh Indicator**: Show last updated timestamp
11. **Optimize Geocoding**: Cache geocoded addresses to prevent repeated API calls

Import `useTodayVisits` hook from `use-dashboard-data.ts` and update the component to use React Query instead of Zustand stores.

### src\app\dashboard\page.tsx(MODIFY)

References:

- src\app\dashboard_components\error-boundary.tsx(NEW)
- src\app\dashboard_lib\dashboard-config.ts(NEW)

Refactor the main dashboard page with improved structure and error handling:

1. **Add Error Boundaries**: Wrap major sections (KPI cards, activities, map, insights) in the new `ErrorBoundary` component
2. **Add Section Grouping**: Wrap KPI cards in a visually distinct section with background color and heading ("Requires Attention")
3. **Improve Layout**: Add section headings for "Today's Overview" and "Key Insights"
4. **Add Visual Hierarchy**: Use different background colors or borders to separate critical from informational sections
5. **Remove Hardcoded Defaults**: Use `DASHBOARD_CONFIG` for default values
6. **Add Loading State**: Show better loading state for entire dashboard
7. **Add Refresh All**: Enhance refresh functionality to update all sections
8. **Improve Responsive Layout**: Ensure proper spacing and gaps on all screen sizes
9. **Add Animation**: Subtle fade-in animation for sections as they load
10. **Better Grid Layout**: Adjust grid columns for better balance (consider 2-column layout for insights)

Import `ErrorBoundary`, `DASHBOARD_CONFIG`, and update the layout structure with semantic HTML sections.

### src\app\dashboard_lib\types.ts(NEW)

Create a centralized types file for dashboard-specific TypeScript interfaces:

1. Define `AlertPriority` type: 'critical' | 'high' | 'medium' | 'low'
2. Define `AlertType` type: 'Overdue Payment' | 'Low Stock' | 'Inactive Client' | 'Tomorrow Delivery'
3. Define `Alert` interface with properties:
   - type: AlertType
   - priority: AlertPriority
   - data: any (or specific types)
   - link: string
   - timestamp: Date
   - id: string
4. Define `KpiTrend` interface:
   - value: number
   - change: number
   - changePercent: number
5. Define `DashboardSection` type for section configuration
6. Define `VisitWithCoords` interface (move from today-visits-map.tsx)
7. Export all types for use across dashboard components

This centralizes type definitions and improves type safety across the dashboard.

### src\app\dashboard_components\scroll-indicator.tsx(NEW)

References:

- src\components\ui\scroll-area.tsx

Create a reusable scroll indicator component to show when content is scrollable:

1. Accept props: `children`, `height` (ScrollArea height), `className`
2. Use IntersectionObserver or scroll event to detect if content overflows
3. Show gradient fade at bottom when content is scrollable
4. Show gradient fade at top when user has scrolled down
5. Render ScrollArea with the provided height
6. Include smooth transitions for gradient appearance/disappearance
7. Support dark mode with appropriate gradient colors
8. Include TypeScript interfaces

This component will wrap ScrollArea instances in `alerts.tsx`, `activity-feed.tsx`, `today-order-log.tsx`, and `today-agenda.tsx` to improve scannability.

### src\app\dashboard_components\refresh-indicator.tsx(NEW)

References:

- src\components\ui\button.tsx
- src\components\ui\tooltip.tsx

Create a component to display last updated timestamp and refresh button:

1. Accept props: `lastUpdated` (Date), `onRefresh` (callback), `isRefreshing` (boolean)
2. Display "Updated X minutes ago" using `formatDistanceToNow` from date-fns
3. Include a small refresh icon button
4. Show loading spinner when `isRefreshing` is true
5. Add tooltip explaining what gets refreshed
6. Use muted text color for timestamp
7. Support compact mode for use in card headers
8. Include TypeScript interfaces

This component will be used in section headers across `alerts.tsx`, `activity-feed.tsx`, `weekly-lookahead.tsx`, etc. to show data freshness.

### src\app\dashboard_lib\alert-utils.ts(NEW)

References:

- src\app\dashboard_lib\types.ts(NEW)

Create utility functions for alert processing and prioritization:

1. **`calculateAlertPriority`**: Function that determines priority level based on alert type and data
   - Overdue payments > 30 days: critical
   - Overdue payments < 30 days: high
   - Low stock (< 5): high
   - Low stock (< 10): medium
   - Tomorrow deliveries: medium
   - Inactive clients: low
2. **`sortAlertsByPriority`**: Function to sort alerts array by priority
3. **`getAlertIcon`**: Function that returns appropriate Lucide icon for alert type
4. **`getAlertActionButtons`**: Function that returns appropriate quick action buttons for each alert type
5. **`formatAlertMessage`**: Function to generate user-friendly alert messages
6. Include proper TypeScript types and JSDoc comments

This file will be used by `alerts.tsx` to handle alert logic in a centralized, testable way.

### src\app\dashboard_lib\kpi.ts(MODIFY)

References:

- src\app\dashboard_lib\dashboard-config.ts(NEW)
- src\app\dashboard_lib\types.ts(NEW)

Enhance the KPI computation utilities with trend calculation:

1. Import `DASHBOARD_CONFIG` and use it instead of hardcoded threshold (10)
2. Add a new function `computeKpiTrends` that calculates percentage change from previous period:
   - Accept current and previous data sets
   - Return trend objects with value, change, and changePercent
3. Add a new function `computeKpiWithHistory` that includes sparkline data:
   - Accept historical data (last 7 days)
   - Return KPI values with trend and sparkline arrays
4. Update `computeKpis` function to accept optional previous data for trend calculation
5. Add JSDoc comments documenting each function
6. Export trend calculation utilities for use in other components

This enables the enhanced KPI cards to display trends and sparklines.

### src\app\dashboard\README.md(NEW)

Create comprehensive documentation for the dashboard module:

1. **Overview**: Explain the dashboard's purpose and architecture
2. **File Structure**: Document the organization of components, hooks, and utilities
3. **Data Flow**: Explain how data flows from API → hooks → components
4. **Component Guide**: Document each component's purpose and props
5. **Configuration**: Explain `DASHBOARD_CONFIG` and how to modify settings
6. **Customization**: Guide for adding new KPI cards, alerts, or sections
7. **Error Handling**: Explain error boundary usage and error recovery
8. **Performance**: Document caching strategy and optimization techniques
9. **Testing**: Guide for testing dashboard components
10. **Troubleshooting**: Common issues and solutions

This documentation will help future developers understand and maintain the dashboard.

---

Implementation Log — Dashboard Enhancement (2025-12-05)

1. Added core configuration and types

   - Created `src/app/dashboard/_lib/dashboard-config.ts` with thresholds, cache timing, UI variants
   - Introduced `src/app/dashboard/_lib/types.ts` for `AlertData`, `AlertItem`, and `VisitWithCoords`

2. API improvements

   - Refactored `dashboard-api.ts` to use config values and robust typing
   - Implemented `getTodayVisits` with geocoding and merged visit/maintenance sources

3. Hooks

   - Standardized query options via config and added `useTodayVisits`

4. Reusable UI

   - Added `SectionCard`, `EmptyState`, `PriorityBadge`, `ErrorBoundary`, `ScrollIndicator`, `RefreshIndicator`

5. Component updates

   - Alerts: prioritized, cleaned UI, consistent actions
   - Activity feed: streamlined rendering and skeletons
   - Weekly lookahead: improved loading and hover affordances
   - Today agenda/log: scroll indicators, empty states, better typing
   - Visits map: query-driven data, zoom-to-fit, info windows
   - Page: error boundaries around volatile sections, header refresh indicator

6. KPI utilities

   - Added `computeTrend` and `buildSparkline` with unit tests

7. Tests

   - `alert-utils.test.ts` and `kpi.test.ts` added and verified locally with Vitest

8. Verification
   - Lint clean for `src/app/dashboard`
   - Dev preview verified via `http://localhost:3001/`

Notes

- Imports normalized to project aliases (`@/lib/...`)
- Non-dashboard TypeScript warnings remain outside the scope of this enhancement
