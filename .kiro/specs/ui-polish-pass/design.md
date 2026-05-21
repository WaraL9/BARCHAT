# Design Document

## Overview

This design describes the implementation approach for a UI polish pass across the BARCHAT app. All changes are purely presentational or state-management-local (no backend changes). The app uses Next.js 14 with Tailwind CSS and existing component architecture is preserved — changes are scoped to styling classes, minor state additions, and a new skeleton component.

## Architecture

This is a frontend-only polish pass. No new services, APIs, or data flows are introduced. All changes modify existing React components' Tailwind classes and add one new presentational component (SkeletonCard). The component hierarchy remains unchanged — only styling and minor state additions are involved.

## Components and Interfaces

### Modified Components

**CountdownTimer** (`app/match/[id]/CountdownTimer.tsx`)
- Props: unchanged
- Changes: Typography classes updated to 8rem, tabular-nums, tracking-tight

**ProfileHeader** (`app/match/[id]/ProfileHeader.tsx`)
- Props: unchanged
- Changes: Photo dimensions increased to 80px (w-20 h-20)

**WingmanCard** (`app/match/[id]/WingmanCard.tsx`)
- Props: add `onClose?: () => void`
- Changes: Pastel background, subtle border, close button, loading text update

**MatchPage** (`app/match/[id]/page.tsx`)
- State: add `wingmanVisible: boolean` (default true)
- Changes: Conditional rendering of WingmanCard

**BarPage** (`app/bar/page.tsx`)
- State: add `likingId: string | null`
- Changes: Skeleton loading, intent badge colors, verified badge styling, like spinner

### New Components

**SkeletonCard** (`app/bar/SkeletonCard.tsx`)
```typescript
interface SkeletonCardProps {}

export default function SkeletonCard(): JSX.Element
```
Renders a shimmer placeholder matching Patron_Card dimensions (same padding, gap, rounded corners).

### Interface Changes

```typescript
// WingmanCard updated props
interface WingmanCardProps {
  icebreaker: string | null;
  tip: string | null;
  onUseThis: (text: string) => void;
  onClose?: () => void; // NEW — fires when close button is clicked
}
```

## Data Models

No data model changes. This feature is purely presentational. All existing Supabase tables and queries remain unchanged.

## Detailed Design

### 1. Countdown Timer Typography (Req 1)

Update the `CountdownTimer` component's digit `<p>` element:

```tsx
<p className={`font-mono text-[min(8rem,18vw)] font-bold tracking-tight tabular-nums leading-none ${digitClasses}`}>
```

Key Tailwind classes:
- `text-[min(8rem,18vw)]` — 8rem on 390px+ viewports, scales down proportionally below
- `tracking-tight` — tight letter-spacing
- `tabular-nums` — sets `font-variant-numeric: tabular-nums`
- `leading-none` — prevents excessive line-height

The existing responsive classes (`sm:text-8xl md:text-9xl`) are removed since the requirement specifies a fixed 8rem size.

### 2. Profile Header Photo Sizing (Req 2)

Update `ProfileCard` in `ProfileHeader.tsx`:
- Photo/fallback: `w-16 h-16` → `w-20 h-20` (80px at default 1rem = 16px)
- Intent badge already renders below the photo in the flex-col layout — no structural change needed

### 3. Icebreaker Card Styling (Req 3)

Update `WingmanCard` background and border:

```tsx
<div className="relative mx-4 my-3 rounded-2xl bg-violet-100/10 border border-violet-300/20 p-4">
```

- `bg-violet-100/10` — soft pastel violet tint at low opacity
- `border-violet-300/20` — subtle complementary border
- `relative` — anchors the absolute-positioned close button

### 4. Match Page Responsive Layout (Req 4)

The existing `max-w-[390px] mx-auto` on the match page container already satisfies Req 4.2. The `min(8rem,18vw)` on the timer handles graceful shrink below 390px.

### 5. Bar Page Card Scannability (Req 5)

**Intent Badge Colors:**

```typescript
const INTENT_COLORS: Record<Intent, string> = {
  drink_buddy: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  casual_date: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
  language_exchange: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  new_in_town: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  serious: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
};
```

**Verified Checkmark:**
```tsx
<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold" aria-label="Verified">✓</span>
```

### 6. Loading States — Form Submission (Req 6)

Add `likingId` state. While in-flight, render a spinner SVG inside the button and disable it.

### 7. Loading States — Bar Floor Skeleton (Req 7)

Create `SkeletonCard` with `animate-pulse` and matching dimensions. Render 3 instances during loading.

### 8. Loading States — Wingman Loading (Req 8)

Update loading text from "Wingman is thinking…" to "Loading wingman...".

### 9. Wingman Widget Close Button (Req 9)

Add close button with 44px tap target (`w-11 h-11`), absolute positioned top-right. Accept `onClose` prop. Match page manages `wingmanVisible` state.

## Error Handling

No new error states are introduced. Existing error handling in the bar page (Supabase query failures) and match page (match not found) remains unchanged. The like button spinner gracefully handles failures by re-enabling the button.

## Testing Strategy

All changes are visual/presentational. Testing approach:
- Manual visual inspection at 390px viewport width
- Verify no horizontal scroll on match page and bar page
- Verify skeleton cards render during loading state
- Verify close button dismisses wingman card
- Verify intent badge colors match the defined color map

## Correctness Properties

### Property 1: Countdown Timer renders with 8rem-equivalent font size and tabular-nums

The rendered countdown digits element uses `text-[min(8rem,18vw)]` and includes the `tabular-nums` class for stable digit widths.

**Validates: Requirements 1.1, 1.2**

### Property 2: Profile Header photos are 80px circles

Each profile photo or fallback element in the ProfileHeader has rendered width and height of 80px (w-20 h-20 in Tailwind).

**Validates: Requirements 2.1**

### Property 3: Wingman Card has pastel background and border

The WingmanCard container has `bg-violet-100/10` background and `border-violet-300/20` border classes applied.

**Validates: Requirements 3.1, 3.2**

### Property 4: No horizontal overflow at 390px viewport

At a viewport width of 390px, the Match_Page and Bar_Page do not produce horizontal scrollbars.

**Validates: Requirements 1.3, 2.3, 4.1**

### Property 5: Intent badge color mapping is exhaustive

Every value in the `Intent` union type has a corresponding entry in the `INTENT_COLORS` map on the bar page.

**Validates: Requirements 5.2**

### Property 6: Skeleton card count during loading

While the bar page is in loading state, exactly 3 SkeletonCard elements are rendered.

**Validates: Requirements 7.1**

### Property 7: Close button tap target meets 44px minimum

The wingman close button element has minimum dimensions of 44×44 CSS pixels (w-11 h-11).

**Validates: Requirements 9.4**

### Property 8: Wingman visibility toggle

After the close button is clicked, the WingmanCard is removed from the DOM and the layout reclaims the space.

**Validates: Requirements 9.2, 9.3**

### Property 9: Loading wingman text

While `icebreaker` is null, the WingmanCard displays "Loading wingman..." with a pulse animation.

**Validates: Requirements 8.1**

## File Changes Summary

| File | Action |
|------|--------|
| `app/match/[id]/CountdownTimer.tsx` | Modify — typography classes |
| `app/match/[id]/ProfileHeader.tsx` | Modify — photo size classes |
| `app/match/[id]/WingmanCard.tsx` | Modify — pastel styling, close button, loading text |
| `app/match/[id]/page.tsx` | Modify — wingman visibility state |
| `app/bar/page.tsx` | Modify — skeleton loading, intent colors, verified badge, like spinner |
| `app/bar/SkeletonCard.tsx` | Create — new skeleton component |
