<!-- @format -->

# Drill-Down System Documentation

## Overview

The Drill-Down System is a high-performance, adaptive navigation and insight layer for the SynergyFlow ERP. It allows users to gain instant context on any entity (Company, Order, Product, etc.) through **Adaptive Insight Cards**—rich, type-specific previews that appear on hover or command.

Key capabilities:
- **Global Reach:** Works on any element with data attributes.
- **Adaptive Previews:** Unique card layouts for 14 different entity types (e.g., Company Health Scores, Order Tracking Timelines).
- **Interactive:** Perform actions (Restock, Invoice, Call) directly from the preview.
- **Velocity-Aware:** Prevents "tooltip storms" during fast scrolling.
- **Peek Mode:** Press `Space` or `Alt` to open a stable, detailed view.

## Core Components

### 1. `GlobalDrillListener`
A singleton component (mounted in `RootLayout`) that listens for interactions with any element bearing the `data-drill-kind` attribute. It handles:
- **Velocity Tracking:** Delays tooltips when mouse speed > 800px/s.
- **Keyboard Shortcuts:** `Space`/`Alt` for Peek Mode, `Arrows` for navigation.
- **Mobile Gestures:** Long-press to peek, swipe to dismiss.

### 2. `DrillPreviewTooltip`
The floating card component. Features:
- **Framer Motion:** Smooth entry/exit animations.
- **Visual Theming:** Gradient borders based on entity type (Blue=CRM, Amber=Ops, Green=Finance).
- **Auto-Pin:** Pins the card after 3 seconds of dwelling.

### 3. `DrillPeekModal`
A medium-sized modal that provides a stable view of the entity, triggered by holding `Space`. Ideal for "Power User" comparisons.

### 4. Specialized Visualizations
We use dedicated micro-components to render data density efficiently:
- **`ScoreGauge`**: Circular health/performance meter (Company, Branch).
- **`OrderStepper`**: Visual progress bar (Order status).
- **`StockVelocity`**: Inventory health bar showing days of coverage (Product).
- **`CanvasSparkline`**: Lightweight trend charts (Revenue).
- **`MiniTable`**: Top products/orders lists (Manufacturer, Category).
- **`TimelineVertical`**: Vertical status history (Maintenance).

---

## Supported Entity Types & "Personas"

The system is not just a data dump. Each entity has a specific "Question" it answers:

| Entity | User Question | Visual Solution |
| :--- | :--- | :--- |
| **Company** | "Is this client healthy?" | Health Score Gauge + LTV + Outstanding Balance |
| **Order** | "Where is it?" | OrderStepper (Placed → Packed → Shipped) |
| **Product** | "Do we have stock?" | StockVelocity Bar + Incoming Stock Alert |
| **Barista** | "How are they performing?" | Star Rating + Next Shift + Skill Tags |
| **Revenue** | "What's the trend?" | Sparkline Chart + Top Driver Breakdown |
| **Maintenance** | "What's the status?" | Vertical Timeline (Requested → Arrived → Done) |

---

## Usage Guide

### Basic Usage (Data Attributes)
Add these attributes to *any* HTML element:

```tsx
<div 
  data-drill-kind="company" 
  data-drill-payload='{"id":"123", "name":"Acme Corp"}'
  className="cursor-pointer hover:underline"
>
  Acme Corp
</div>
```

### React Component Usage
Use the `DrillTarget` wrapper for type safety:

```tsx
import { DrillTarget } from "@/components/drilldown/drill-target";

<DrillTarget kind="order" payload={{ id: "ORD-99", total: 500 }}>
  <span>Order #ORD-99</span>
</DrillTarget>
```

### Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **Space** (Hovering) | Open **Peek Mode** (Stable Modal) |
| **Alt** (Hovering) | Open Peek Mode |
| **Alt + Left/Right** | Navigate History (Back/Forward) |
| **Ctrl + Click** | Open Full Page in New Tab |

---

## Architecture & Configuration

### Registry (`src/lib/drilldown/registry.ts`)
Maps `DrillKind` to a configuration object containing:
- `renderAsyncPreview`: The React component for the card content.
- `quickActions`: Array of buttons (e.g., "Call", "Restock") with simulated or real logic.
- `fetchPreviewData`: Function to load data (currently points to `api/drilldown/preview`).

### API Layer (`src/app/api/drilldown/preview/route.ts`)
A rich mock API that simulates database responses. It generates realistic data structure for all 14 entities, enabling full UI testing without a backend connection.

### Action Helper (`src/lib/drilldown/action-helper.ts`)
Provides `simulateAction(label)` to mimic network latency for "Inline Actions" (showing spinners/checkmarks).

---

## Developer Notes

### Adding a New Visualization
1. Create the component in `src/components/drilldown/`.
2. Update the entity config in `src/lib/drilldown/definitions/`.
3. Ensure the API route returns the necessary data fields.

### Theming
The `DrillCard` component accepts a `kind` prop to apply specific color themes:
- **CRM (Company, Customer):** Blue/Indigo
- **Operations (Order, Branch):** Amber/Orange
- **Finance (Revenue, Payment):** Emerald/Green
- **Inventory (Product, Manufacturer):** Slate/Gray

### Accessibility
The `DrillTarget` component includes comprehensive accessibility support:
- **ARIA Labels:** Dynamic `aria-label` based on entity type and name
- **Keyboard Navigation:** Enter/Space to activate, built-in focus indicators
- **Screen Reader Hints:** Contextual instructions for interaction
- **Focus Visible:** Ring indicators for keyboard users

### Global Search (Cmd+K)
Use the `DrilldownSearch` component for quick entity access:
```tsx
import { DrilldownSearch } from "@/components/drilldown/drilldown-search";

// In your header/nav component
<DrilldownSearch />
```
Features:
- Recent entities from analytics
- Grouped results by entity type
- Keyboard shortcuts (↑↓ navigate, Enter select, Esc close)

---

## Testing Coverage

### Unit Tests (Vitest)
- `use-drill-preview-data.test.tsx`: 10 tests covering caching, fetching, error handling
- `drill-analytics.test.ts`: 21 tests covering event tracking, performance metrics, percentiles

### E2E Tests (Playwright)
- `e2e/drilldown.spec.ts`: Order and Company preview hover tests

Run tests:
```bash
npm run test           # Unit tests
npm run test:e2e      # E2E tests
```

---

## Recent Enhancements (v3.1.0)

### Completed Features
- ✅ **Real Data Integration:** Product drilldown page now uses Supabase queries
- ✅ **Accessibility:** ARIA labels, focus indicators, screen reader support
- ✅ **Global Search:** Cmd+K shortcut for quick entity access
- ✅ **Testing:** 31 unit tests for core hooks and analytics

### Future Roadmap

| Priority | Feature | Description |
| :--- | :--- | :--- |
| High | E2E Test Expansion | Add tests for all 14 entity types |
| Medium | Preview Customization | Size options (compact/normal/expanded) |
| Medium | Cross-Entity Insights | Relationship graphs and impact analysis |
| Low | Advanced Caching | Predictive prefetching, offline support |
| Low | Performance Dashboard | Real-time monitoring for admins |