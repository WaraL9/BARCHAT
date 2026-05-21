# Implementation Plan:

## Overview

UI polish pass across the BARCHAT app covering countdown timer typography, profile header sizing, icebreaker card styling, bar page scannability, loading states, and wingman close button.

## Tasks

- [ ] 1. Update `app/match/[id]/CountdownTimer.tsx` — replace font-size classes (`text-7xl sm:text-8xl md:text-9xl`) with `text-[min(8rem,18vw)]`, add `tabular-nums`, `tracking-tight`, and `leading-none` to the digit element
- [ ] 2. Update `app/match/[id]/ProfileHeader.tsx` — change photo/fallback dimensions from `w-16 h-16` to `w-20 h-20` (80px circles)
- [ ] 3. Update `app/match/[id]/WingmanCard.tsx` — replace `bg-white/5 border border-white/10` with `bg-violet-100/10 border border-violet-300/20`, add `relative` to container, update loading text to "Loading wingman..."
- [ ] 4. Add `onClose` prop to `WingmanCard` and render a close button (`×`) with `absolute top-2 right-2 w-11 h-11` positioning and `aria-label="Close wingman"`
- [ ] 5. Add `wingmanVisible` state to `app/match/[id]/page.tsx`, conditionally render WingmanCard, pass `onClose={() => setWingmanVisible(false)}`
- [ ] 6. Add `INTENT_COLORS` map to `app/bar/page.tsx` and apply color-coded classes to the intent badge span
- [ ] 7. Update verified checkmark in `app/bar/page.tsx` from plain text to a styled circular badge (`bg-blue-500 text-white w-5 h-5 rounded-full`)
- [ ] 8. Create `app/bar/SkeletonCard.tsx` component with `animate-pulse` shimmer matching Patron_Card dimensions
- [ ] 9. Update `app/bar/page.tsx` loading state to render 3 `SkeletonCard` components instead of "Loading bar floor…" text
- [ ] 10. Add `likingId` state to `app/bar/page.tsx`, show inline spinner in Like button while in-flight, disable button during submission

## Task Dependency Graph

```json
{
  "waves": [
    [1, 2, 3, 6, 7, 8, 10],
    [4, 9],
    [5]
  ]
}
```

## Notes

- All changes are purely presentational — no backend or database modifications
- Tailwind CSS utilities are used exclusively; no custom CSS files needed
- The `min(8rem,18vw)` approach for the countdown ensures it scales gracefully below 390px
- The close button uses `w-11 h-11` (44px) to meet WCAG tap target guidelines
