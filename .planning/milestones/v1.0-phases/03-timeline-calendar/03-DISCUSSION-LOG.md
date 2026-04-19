# Phase 3: Timeline & Calendar - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-10
**Phase:** 3 — Timeline & Calendar

---

## Gray Areas Selected

User selected all 4 gray areas for discussion:
1. App layout & view routing
2. Timeline card design
3. Calendar heatmap
4. Infinite scroll mechanics

---

## Area 1: App Layout & View Routing

**Q: How should the main content area work when switching between sidebar nav items?**
Options: Timeline IS the Journal view / Split sidebar+editor always / Three-panel
**Selected:** Timeline IS the Journal view
> Clicking Journal shows full-width timeline. Clicking an entry opens editor. Sidebar entry list goes away — timeline IS the entry browser.

**Q: When the user clicks an entry to edit it, how do they get back?**
Options: Back button in editor / Sidebar Journal click / Breadcrumb
**Selected:** Back button in editor
> Editor gains a "← Back" button. Clean, explicit navigation.

**Q: Where does "New Entry" live now that the sidebar entry list is gone?**
Options: Button in timeline header / FAB / Keep in sidebar
**Selected:** Button in the timeline header
> Persistent "New Entry" button at the top of the timeline view.

---

## Area 2: Timeline Card Design

**Q: How should the 150-char preview appear on the entry card?**
Options: Plain text truncated / Rendered Markdown first paragraph
**Selected:** Plain text truncated with ellipsis
> Strip Markdown, show plain text preview with ellipsis when truncated.

**Q: How does expand-inline (TIME-05) work on an entry card?**
Options: Expand in-place full Markdown / Click opens editor / Expand plain text + Edit button
**Selected:** Expand in-place, full Markdown rendered
> Clicking Expand reveals full Markdown (read-only) in-place. Collapse button hides it.

**Q: How should day separators look (TIME-06)?**
Options: Date label + thin rule / Bold date header / Amber left accent
**Selected:** Date label + thin rule
> Full-width row: "Wednesday, Apr 9" on left, horizontal rule extending right.

---

## Area 3: Calendar Heatmap

**Q: How should the monthly calendar heatmap be implemented?**
Options: Plain CSS grid custom / react-calendar library / D3.js
**Selected:** Plain CSS grid, custom built
> 7-column CSS grid, no library dependency, full control over amber styling.

**Q: How many intensity levels and what does "no entries" look like?**
Options: 4 levels (0,1,2-3,4+) / 3 levels / Continuous opacity
**Selected:** 4 levels (0, 1, 2-3, 4+) in amber
> Empty: faint bg/border. 1 entry: amber/10. 2-3: amber/30. 4+: amber/60.

**Q: Where does the monthly calendar live in the app layout?**
Options: Full main content / Top of timeline / Sidebar panel
**Selected:** Full main content area when Calendar nav is active
> Clicking "Calendar" replaces main content with the full calendar view.

---

## Area 4: Infinite Scroll Mechanics

**Q: How should infinite scroll be implemented?**
Options: IntersectionObserver + sentinel div / react-virtual / Scroll event + threshold
**Selected:** IntersectionObserver + sentinel div
> Hidden sentinel div at bottom. When visible, load next 20 entries. No library needed.

**Q: What shows while more entries are loading?**
Options: Subtle spinner / Skeleton cards / Claude's discretion
**Selected:** Subtle spinner at bottom
> Small centered spinner below last card while fetching. Disappears when entries arrive.

---

*Discussion completed: 2026-04-10*
