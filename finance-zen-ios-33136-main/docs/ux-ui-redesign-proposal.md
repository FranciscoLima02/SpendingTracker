# Finance Zen Offline-First Redesign

## Main UX Problems Found
- **Fragmented month management**: opening, closing, and reviewing a month live in different areas, forcing hunting through menus and breaking the “one surface” promise.
- **Heavy capture flow**: adding an expense or income requires multiple screens, duplicated category selection, and manual account picks every time.
- **Low glanceability**: core indicators (left to spend, savings, balances per card) are scattered below the fold, so users scroll before acting.
- **Category opacity**: sectors mix fixed, variable, and investing buckets without visual grouping, making it hard to know where money is leaking.
- **Clunky month rollover**: no clear guidance on what happens to leftover balances or how the next month inherits targets, which causes spreadsheet-style uncertainty.
- **Inconsistent visual rhythm**: typography sizes and spacing shift between panels, producing a cramped, non-native feel that increases cognitive load.

## Functional UX Redesign Proposal
- **Single Monthly Canvas**: keep the entire month on one screen with stacked modules—`Hero Totals`, `Sector Overview`, `Recent Activity`, `Month Checklist`. Each module collapses/expands but defaults to a compressed view so everything fits on a 390 px viewport without scrolling.
- **Inline Capture Rail**: anchor a floating `+` button that expands into an inline composer at the bottom of the dashboard. The composer remembers the last sector, pre-fills the most recent amount, and swaps between Expense/Income/Transfer in-place.
- **One-tap Sector Updates**: each sector row shows remaining amount and current balance; tapping the amount opens a numeric keypad overlay with +/- quick nudges and the ability to mark it as planned vs. actual.
- **Guided Month Lifecycle**: the top header hosts `Open Month` / `Close Month` CTAs that morph based on state. Opening clones budgets, seeds mandatory outflows, and prompts for meal/credit funding. Closing walks through review, rollover decisions, and locks history.
- **Transparent Calculations**: info buttons surface inline formulas (e.g., “Essentials target = Rent + Utilities + Food target”). The user can edit ratios directly from the Sector Overview without leaving the screen.
- **Offline Integrity**: every action immediately writes to local storage (IndexedDB/CoreData). When the user closes the month, a JSON snapshot is saved for manual backup.

## New Navigation Structure
- **Primary Tab Bar (bottom)**:
  1. **Month** (default): compact dashboard + capture rail + lifecycle actions.
  2. **History**: horizontal month scroller with read-only summaries, export, and trend charts.
  3. **Settings**: category targets, formula ratios, card defaults, backup/restore.
- **Gestures & Shortcuts**:
  - Swipe left/right on the Month title to jump between months.
  - Pull down on the Month screen reveals quick filters (Essentials vs Lifestyle vs Investing).
  - Long-press the `+` button to open the last used flow instantly.
  - Haptic tap on sector rows confirms updates.

## UI Layout Per Screen
### Month Dashboard (default)
- **Sticky Header (56 px)**: Month name dropdown + streak indicator, `Open/Close` button (primary accent), current day marker.
- **Hero Stat Strip**: four chips (`Left to Spend`, `Saved`, `Credit Card`, `Meal Card`) with progress rings and microcopy. Each chip is tappable to open detail sheet.
- **Sector Overview**: accordion grouped into Essentials, Lifestyle, Investing, Buffer. Each row shows sector name, remaining €/planned €, trend arrow, and status dot (green/amber/red). Collapse control lives on the right.
- **Recent Activity Card**: five latest movements in a compact table with inline edit icons. “See all” reveals a modal list.
- **Month Checklist**: pill buttons for `Fund Cards`, `Confirm Rent`, `Review Savings`, `Close Month`. Completed items gain checkmark and greyed accent.
- **Floating Action Dock**: right-aligned on large screens, bottom-centered on mobile—`+` main button, flanked by ghost buttons for `Transfer` and `Adjust`.

### Add / Edit Value Sheet
- **Entry Type Segmented Control**: Expense · Income · Transfer.
- **Quick Chips Row**: last three sectors used; tapping applies sector + last amount.
- **Amount Pad**: numeric keypad with haptic feedback, includes quick add/subtract €5 and €10 buttons.
- **Sector & Account Pickers**: inline pill selector; Transfer view shows From/To columns.
- **Notes & Tags**: optional collapsed field, expanding with one tap.
- **Confirm Bar**: sticky bottom `Save` button with live preview (“Will deduct €42 from Credit Card · Shit Money”). Undo toast after save.

### Close Month Flow
- **Step 1 – Summary**: modal overlay with snapshot cards for Income, Expenses, Net Saved, Carry-over. Confetti accent if net positive.
- **Step 2 – Rollover Decisions**: sliders for each account (Credit, Meal, Savings, Crypto) with presets (Keep, Move to Savings, Zero Out). Shows resulting opening balances.
- **Step 3 – Lock & Note**: toggle to archive the month, optional reflection note, final `Close Month` CTA.

### History Screen
- **Month Carousel**: scrollable chips showing net result and left-to-spend delta.
- **Selected Month Summary**: condensed version of the dashboard but read-only.
- **Trends Module**: sparkline comparisons (Savings vs Target, Essentials %), export button.

## Color & Typography System
- **Palette**:
  - Base background: `#0E1114` (soft charcoal).
  - Surface cards: `#161B22`.
  - Primary accent: `#5D8CFF` (actions and progress).
  - Secondary accent: `#4DC2A6` (positive balances).
  - Warning: `#F5C045`; Danger: `#FF6B6B`.
  - Neutral text: `#F7F9FC` (primary), `#9AA4B2` (secondary).
- **Typography**:
  - Primary: SF Pro Text / Inter fallback.
  - Heading size ladder: 24 px (H1 hero numbers), 18 px (H2 section titles), 15 px (labels), 13 px (meta captions).
  - Numerals use tabular figures for vertical alignment.
- **Spacing**:
  - Base unit: 8 px.
  - Module padding: 16 px.
  - Minimum tap target: 52 × 52 px.
  - Card radius: 16 px.

## Interaction Design
- **One-Tap Logic**: tapping a sector amount opens the keypad sheet anchored to that row; saving collapses the sheet with a spring animation (220 ms) and emits haptic success.
- **Floating Composer**: `+` button expands into a bottom sheet with contextual title; swiping down cancels. Re-opens with last context when triggered from inline edit icons.
- **Month Lifecycle Feedback**: opening a month triggers a subtle page curl animation and updates the checklist; closing shows a celebratory pulse and archives the dashboard in the History tab.
- **Micro-interactions**: progress rings animate from previous value to new value on every save; checklist pills flip vertically when completed.
- **Undo Snackbar**: persists for 8 seconds with “Undo” action, respecting reduced motion settings.

## Accessibility & Simplicity Improvements
- Color contrast meets WCAG AA (accent on dark surfaces ≥ 4.5:1). Provide high-contrast toggle that swaps to lighter surfaces if preferred.
- Text scales with Dynamic Type up to 120% while maintaining layout integrity via auto-wrapping hero stats and stacking chips.
- VoiceOver labels include formulas (“Left to Spend, €320, calculated from targets minus spending”).
- All primary actions reachable with external keyboard: `⌘+N` new entry, arrow keys navigate sectors, `Enter` confirms.
- Motion respects `prefers-reduced-motion`, swapping to opacity fades and disabling confetti.
- Offline state indicator sits in header with clear icon + label (“Offline · Data saved locally”).

## Extra Option
Generate redesigned screen mockups in flat minimal style, showing dashboard, month view, add expense modal, and close-month summary.
