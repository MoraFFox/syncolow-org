<!-- @format -->

I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

The drilldown system is already well-established with comprehensive registry entries for `barista` and `branch` entities (including async preview data fetching, quick actions, and related entities). However, the **baristas pages and maintenance crew list currently use plain Links** instead of DrillTarget components, missing out on the hover preview functionality.

**Current State:**

- `/baristas/page.tsx`: Barista cards show name (Link), branch name (plain text), ratings, visits
- `/baristas/[baristaId]/page.tsx`: Detail page with branch link (plain Link), placeholder components
- `/maintenance/_components/crew-list.tsx`: Crew member names as plain Links

**Registry Configuration (already implemented):**

- **Barista preview**: Shows name, rating, branch name, visits count, average visit rating
- **Branch preview**: Shows name, location, performance score, barista/maintenance/order counts, machine ownership
- **Quick actions**: Barista (View Branch, View Visits, Call), Branch (View Company, New Order, Schedule Maintenance)

### Approach

Wrap existing interactive elements (barista names, branch names, crew member names) with `DrillTarget` components using the `asChild` prop to preserve current styling while adding hover preview functionality. Follow established patterns from other pages (orders, products, feedback) where DrillTarget wraps Links/spans with `cursor-pointer hover:underline` classes.

**Key Implementation Pattern:**

```tsx
<DrillTarget kind="barista" payload={{ id, name, branchId, branchName, rating, phoneNumber }} asChild>
  <Link href={...} className="hover:underline cursor-pointer">Name</Link>
</DrillTarget>
```

This approach:

- ✅ Preserves existing navigation behavior
- ✅ Adds hover preview with async data fetching
- ✅ Enables quick actions from previews
- ✅ Maintains consistent UX with other drilldown-enabled pages
- ✅ No breaking changes to existing functionality

### Reasoning

Read the target files to understand current implementation (plain Links without drilldown). Examined drilldown registry to confirm barista/branch configurations are complete with async previews and quick actions. Searched for DrillTarget usage patterns across the codebase (orders, products, feedback pages) to understand the established wrapping pattern with `asChild` prop. Verified payload structures in drilldown-types.ts match available data in components.

## Mermaid Diagram

sequenceDiagram
participant User
participant BaristasPage as Baristas Page
participant CrewList as Crew List
participant DrillTarget as DrillTarget Component
participant Registry as Drilldown Registry
participant Supabase as Supabase DB

    User->>BaristasPage: Hover over barista name
    BaristasPage->>DrillTarget: Trigger hover event
    DrillTarget->>Registry: Fetch barista preview data
    Registry->>Supabase: Query barista + visits + branch
    Supabase-->>Registry: Return data
    Registry-->>DrillTarget: Render async preview
    DrillTarget-->>User: Show preview tooltip<br/>(rating, visits, branch)

    User->>BaristasPage: Hover over branch name
    BaristasPage->>DrillTarget: Trigger hover event
    DrillTarget->>Registry: Fetch branch preview data
    Registry->>Supabase: Query branch + baristas + orders
    Supabase-->>Registry: Return data
    Registry-->>DrillTarget: Render async preview
    DrillTarget-->>User: Show preview tooltip<br/>(performance, counts)

    User->>CrewList: Hover over crew member
    CrewList->>DrillTarget: Trigger hover event
    DrillTarget->>Registry: Fetch barista preview data
    Registry->>Supabase: Query maintenance employee visits
    Supabase-->>Registry: Return data
    Registry-->>DrillTarget: Render async preview
    DrillTarget-->>User: Show preview with quick actions<br/>(Call, View Visits, View Branch)

    User->>DrillTarget: Click quick action
    DrillTarget->>User: Navigate to related entity

## Proposed File Changes

### src\app\baristas\page.tsx(MODIFY)

References:

- src\components\drilldown\drill-target.tsx
- src\lib\drilldown-registry.tsx

**Add DrillTarget imports and wrap interactive elements:**

1. Import `DrillTarget` from `@/components/drilldown/drill-target` at the top

2. **Wrap barista name Link (line 78)** with DrillTarget:

   - Kind: `barista`
   - Payload: `{ id: barista.id, name: barista.name, branchId: barista.branchId, branchName: barista.branchName, rating: barista.rating, phoneNumber: barista.phoneNumber }`
   - Use `asChild` prop to preserve Link behavior
   - Keep existing `hover:underline` class on Link

3. **Wrap branch name text (line 85)** with DrillTarget:
   - Kind: `branch`
   - Payload: `{ id: barista.branchId, name: barista.branchName }`
   - Use `asChild` prop
   - Wrap the text in a `<span>` with `cursor-pointer hover:underline` classes

**Example structure:**

```tsx
<DrillTarget kind="barista" payload={{ id: barista.id, name: barista.name, ... }} asChild>
  <Link href={`/baristas/${barista.id}`} className="hover:underline">{barista.name}</Link>
</DrillTarget>
```

This enables hover previews showing barista rating, visits attended, and branch info as specified in the drilldown registry (`d:/My projects/firebase-orginal/src/lib/drilldown-registry.tsx` lines 905-1073).

### src\app\baristas\[baristaId]\page.tsx(MODIFY)

References:

- src\components\drilldown\drill-target.tsx
- src\app\maintenance_components\maintenance-list.tsx

**Add DrillTarget to branch reference and related entities:**

1. Import `DrillTarget` from `@/components/drilldown/drill-target`

2. **Wrap branch Link (line 58)** with DrillTarget:

   - Kind: `branch`
   - Payload: `{ id: branch.id, name: branch.name, companyId: branch.parentCompanyId, performanceScore: branch.performanceScore, machineOwned: branch.machineOwned }`
   - Use `asChild` prop
   - Keep existing `hover:underline` class

3. **In placeholder components** (BaristaKpiCards, BaristaVisitHistory - lines 15-17):
   - When implementing these components later, wrap maintenance visit references with `<DrillTarget kind="maintenance" payload={{ id, branchId, date, status, ... }}>`
   - Wrap branch references in visit history with branch DrillTarget
   - Follow patterns from `d:/My projects/firebase-orginal/src/app/maintenance/_components/maintenance-list.tsx` (lines 108-110, 184-186)

**Note:** The placeholder components are not yet implemented, so add TODO comments indicating where DrillTarget should be added when they're built:

```tsx
// TODO: When implementing, wrap visit items with DrillTarget kind="maintenance"
// TODO: Wrap branch references with DrillTarget kind="branch"
```

### src\app\maintenance_components\crew-list.tsx(MODIFY)

References:

- src\components\drilldown\drill-target.tsx
- src\lib\drilldown-registry.tsx

**Add DrillTarget to crew member names in both mobile and desktop views:**

1. Import `DrillTarget` from `@/components/drilldown/drill-target` at the top

2. **Mobile view - Wrap crew member name Link (line 56):**

   - Kind: `barista` (maintenance employees are treated as baristas in the drilldown system)
   - Payload: `{ id: member.id, name: member.name, phoneNumber: member.phone }`
   - Use `asChild` prop
   - Keep existing `hover:underline` class

3. **Desktop view - Wrap crew member name Link (line 90):**
   - Same DrillTarget configuration as mobile view
   - Kind: `barista`
   - Payload: `{ id: member.id, name: member.name, phoneNumber: member.phone }`
   - Use `asChild` prop
   - Keep existing `hover:underline` class

**Note:** The drilldown registry treats maintenance crew as baristas (see `d:/My projects/firebase-orginal/src/lib/drilldown-registry.tsx` lines 905-1073). The preview will show:

- Barista name
- Phone number (with "Call Barista" quick action)
- Visits attended count
- Average visit rating
- Branch information (if available)

**Example structure:**

```tsx
<DrillTarget
  kind='barista'
  payload={{ id: member.id, name: member.name, phoneNumber: member.phone }}
  asChild
>
  <Link href={`/maintenance/crew/${member.id}`} className='hover:underline'>
    {member.name}
  </Link>
</DrillTarget>
```
