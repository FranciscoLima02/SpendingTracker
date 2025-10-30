# Finance Zen Compact Experience Blueprint

## North Star
Finance Zen becomes a pocket-sized money cockpit: one glance tells the whole story, one tap records the next move. Every surface favors calm clarity, lightning-fast capture, and transparent financial logic while remaining 100% offline.

---

## Navigation & Layout Hierarchy
1. **Monthly Workspace (default screen)**
   - **Sticky command header** (48px): current month selector (horizontal pill carousel), `Open Month` / `Close Month` smart button, last sync timestamp.
   - **Hero summary bar**: four quick stats with emoji anchors—`💶 Left to Spend`, `💰 Saved this Month`, `🪙 Crypto Balance`, `🍽 Meal Card`. Each stat is pressable to reveal detail sheets.
   - **Action dock** (bottom on mobile, right rail on desktop): `+ Expense`, `+ Income`, `Transfer`, `Fund Cards`. Buttons remember last-used category/account and pre-fill amounts.
   - **Insight grid** (two-column cards on desktop, accordion on mobile):
     1. **Plan vs. Actual strip** – essentials vs lifestyle vs investing progress bars with color-coded caps (green/on track, amber/at risk, red/over).
     2. **Savings trajectory** – inline sparkline showing last 6 months plus projected month-end.
     3. **Upcoming obligations** – collapsible list auto-filled from recurring movements happening in next 7 days.
   - **Activity table-card**: compact table with columns `Date`, `Category`, `Account`, `Amount`, `Status`. Inline edit icon opens quick editor. Collapsible to show last 5 vs full month.
   - **Monthly checklist** (foot) – `Card top-ups`, `Rent locked`, `Close review`. Each item flips to green when complete; tapping opens the relevant flow.

2. **History Drawer** (from header or swipe up): horizontal month scroller with mini-summary chips (`Net Saved`, `Variance`). Selecting a month loads its frozen dashboard in read-only mode.

3. **Settings & Formulas** (secondary tab): simplified sections for targets, categories, automation rules, export/import JSON.

---

## Compact Monthly Dashboard Design
- **Above-the-fold completeness**: all mission-critical stats appear without scroll on 390px tall viewport.
- **Card anatomy**: 16px radius, 12px padding, 8px internal spacing, max 3 data points per card.
- **Collapsible groups**: `Essentials`, `Lifestyle`, `Investing`, `Buffer` categories share a stacked accordion. Default state shows totals; expand reveals member categories with progress chips (e.g., `Food €120 / €250`).
- **Variance tokens**: right edge of each category row shows pill `+€35` or `–€20` with contextual color.
- **Adaptive typography**: numeric values use 20px tabular figures, labels 13px uppercase tracking 4% for scanability.

---

## Simplified Add / Edit Value Experience
1. **Global Quick-Add FAB** morphs into a segmented sheet with four tabs: Expense, Income, Transfer, Adjustment.
2. **Smart defaults**:
   - Recent categories pinned to top as chips with amount ghosts (e.g., `🍽 Food €12.50`).
   - Amount field auto-selects with numeric keypad and includes `+/-` toggles for rounding to nearest €5.
   - Account field defaults to most-used per category but exposes a two-column selector (source on left, target on right).
3. **Inline edit**: tapping any row in the activity table opens an inline row editor—fields slide in-place, confirm/cancel buttons appear in-row, saving reflows instantly with micro success toast.
4. **Keyboard shortcuts (desktop)**: `E`=Expense, `I`=Income, `T`=Transfer, arrow keys to cycle categories.
5. **Undo**: after every creation/edit, persistent toast offers undo for 10 seconds.

---

## Open / Close Month Logic
### Opening a Month
1. User taps **`Open Month`** in header.
2. Modal summarises carry-over balances, suggested targets (auto-calculated), and card funding defaults.
3. Confirming triggers:
   - Clone previous month’s categories and planned amounts.
   - Reset `actual` counters to zero but keep rolling balances (credit, meal, savings, crypto).
   - Seed recurring outflows (Rent, Savings transfer, Crypto core/shit, Shit Money allocation) dated day 1 as planned movements.
   - Snapshot of `global totals` to compare later.

### Closing a Month
1. Tapping **`Close Month`** launches a three-step review sheet:
   - **Step 1 – Summary**: Totals for `Income`, `Expenses`, `Net Saved`, `Remaining to Spend`, plus variance vs previous month.
   - **Step 2 – Allocation**: Choose handling of leftovers per account (rollover, move to savings, zero out). Amount inputs use sliders with preset suggestions.
   - **Step 3 – Lock & Archive**: User can add a reflection note; once confirmed, movements are marked immutable and snapshot stored in `MonthlyArchive` collection.
2. Next month preview pops up immediately with editable targets (see auto-goal logic below).

---

## Financial Summaries
### Monthly Snapshot (displayed on dashboard)
- **Income**: planned vs actual, with breakdown of salary, subsidies, extras.
- **Expenses**: essentials, lifestyle, investing, buffer categories; each has remaining amount metric.
- **Net Position**: `(Starting balances + Actual income) - Actual expenses`.
- **Savings Progress**: target vs actual, plus comparison to last month (percent delta).
- **Card Balances**: credit, meal, savings, crypto shown with gauges and warning thresholds (e.g., credit usage >80%).

### Global Overview (History Drawer footer)
- Rolling 6/12-month charts for `Total Saved`, `Average Essentials %`, `Lifestyle variance`.
- Best month badge (“Highest savings: €540 in March”).
- Export summary button generates JSON with monthly archives.

---

## Auto-Calculated Goals & Formulas
- **Essentials target** = min(`rent + utilities + food target`, `monthly income * essentials_ratio (default 0.55)`).
- **Lifestyle target** = `monthly income * lifestyle_ratio (default 0.25)` minus any locked essentials spillover.
- **Investing target** = `monthly income * investing_ratio (default 0.15)` with ability to split between `Crypto Core`, `Crypto Shit`, `Savings`.
- **Buffer target** = `monthly income * 0.05` until buffer account reaches 3× monthly essentials.
- **Left to Spend** = `Essentials target + Lifestyle target - actual expense total` (clamped ≥0).
- **Savings delta** = `actual savings - investing target`.
- **Risk indicator** thresholds:
  - Green ≤ 80% of target spent for elapsed-day ratio.
  - Amber between 80–110%.
  - Red >110% or credit utilization >90%.
- All ratios editable in Settings; tooltips show formula references.

---

## Behavioral Feedback & Microcopy
- **Dynamic headline** above hero stats: “Nice! You saved 18% more than last month” (green), “Heads-up: Lifestyle pace +12%” (amber), “You’re over crypto budget by €60” (red).
- **Celebration moments**: On closing month within 3 days of month-end, confetti pulse and message “Streak +1: Consistent closer.”
- **Nudges**: If `Left to Spend` drops below €50 mid-month, prompt “Lock your Shit Money?” with one-tap action to reduce category target.
- Tone stays calm, confident, instructive without jargon.

---

## Visual System
- **Color palette**:
  - Background `#0E1117` (charcoal navy).
  - Surface `#161C24`.
  - Primary accent `#5C8DFF` for actions.
  - Success `#60E0B5`, Warning `#FFC05B`, Danger `#FF6C6C`.
  - Divider lines `rgba(255,255,255,0.06)`.
- **Typography**: Inter family, weights 600 for headings, 500 for labels, 400 for body. Numerics use tabular feature. Primary size 17px body, 24px for hero stats.
- **Spacing system**: base 8px scale; vertical rhythm 24px sections. Minimum tap target 52×52px.
- **Iconography**: Thin 1.5px line icons with filled accent backgrounds for primary actions; category tokens use duotone glyphs.
- **Motion**: 180ms ease-out for toggles, 220ms spring for sheet expansions, respect `prefers-reduced-motion` by switching to opacity fades.

---

## Offline & Technical Notes
- All state stored in IndexedDB with monthly archives in separate object store for fast load.
- Derived metrics memoized per month to avoid recalculating on every render.
- Support JSON export/import for manual backups, with checksum to confirm integrity.

---

## Implementation Roadmap
1. **Component scaffolding**: build dashboard shell (header, hero stats, action dock, insight grid).
2. **Data orchestration**: introduce monthly archive & snapshot stores, auto-goal engine, and month lifecycle service.
3. **Quick-add revamp**: implement segmented sheet, recent category memory, inline edits.
4. **Behavioral layer**: dynamic headlines, nudges, streak tracking.
5. **Visual polish**: apply palette, spacing, micro-interactions, responsive adjustments.

This blueprint keeps Finance Zen lean yet powerful: every month lives on a single surface, every action is reachable in a tap, and the budgeting brain stays transparent and encouraging.
