# Typography Standardization System

## 4-Tier Typography Hierarchy

### Tier 1 - Display/H1 (Main Headings)
- **Size**: `text-2xl` (24px)
- **Usage**: Page titles, main headers
- **Weight**: `font-bold`
- **Examples**: "Companies & Branches" heading

### Tier 2 - Heading/H2-H3 (Section Headings)
- **Size**: `text-lg` (18px)
- **Usage**: Card titles, major section headers
- **Weight**: `font-semibold`
- **Examples**: Client names in grid/list view

### Tier 3 - Body (Regular Content)
- **Size**: `text-sm` (14px)
- **Usage**: Regular body text, descriptions
- **Weight**: `font-normal` or `font-medium`
- **Examples**: Location text, descriptions

### Tier 4 - Caption/Label (Small Text)
- **Size**: `text-xs` (12px)
- **Usage**: Labels, badges, metadata, timestamps
- **Weight**: `font-medium` or `font-semibold`
- **Examples**: Industry labels, status badges, financial labels

## Implementation Rules

1. **No custom text sizes** - Use only the 4 standardized sizes
2. **Consistent spacing** - Use Tailwind spacing classes consistently
3. **Semantic hierarchy** - Larger text for more important information
4. **Accessibility compliance** - Minimum 12px for all text
5. **Consistent font weights** - Use semantic weights (normal, medium, semibold, bold)

## Color Usage
- **Primary text**: `text-foreground`
- **Secondary text**: `text-muted-foreground`
- **Accent text**: `text-primary`
- **Warning text**: `text-amber-500`
- **Success text**: `text-emerald-500`
- **Destructive text**: `text-destructive`

## Applied Changes

### ClientActions.tsx
- Main heading: `text-2xl font-bold` ✓
- All other text already follows the system ✓

### ClientList.tsx  
- Headers: `text-xs` (standardized from various sizes)
- Client names: `text-base font-semibold` ✓
- Industry labels: `text-xs` ✓
- Location/description: `text-xs` ✓
- Financial data: `text-xs` ✓

### ClientGrid.tsx
- Company names: `text-lg font-bold` ✓
- Industry labels: `text-xs` ✓
- Revenue/Balance labels: `text-xs` ✓
- All other text follows the system ✓

## Benefits
1. **Consistent visual hierarchy** across all components
2. **Improved readability** with standardized sizes
3. **Better accessibility** compliance
4. **Easier maintenance** with consistent patterns
5. **Professional appearance** with cohesive typography