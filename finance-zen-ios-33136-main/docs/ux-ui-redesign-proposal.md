# Finance Zen Daily Manual-Use Redesign

## Main UX Problems Found
- **Too many steps to capture**: adding a movement still requires navigating away from the dashboard and repeating category/account picks.
- **Month context is hidden**: users cannot see which month is active or jump to a previous one without leaving the screen.
- **Buckets sprawl vertically**: remaining amounts live in long lists that force scrolling before the critical “left to spend” numbers appear.
- **Lifecycle friction**: opening/closing months asks multiple questions and scatters actions, so duplicates and locked months become confusing.
- **Floating actions vanish**: capture triggers scroll with the content, so the “+” action disappears when reviewing history.

## Updated Navigation Structure
- **Bottom navigation (3 tabs)**
  1. **Hoje (Today)** – the compact monthly dashboard with capture, suggestions, and account balances (default landing).
  2. **Meses** – stacked month summaries with export/share. Also the entry point for archival analytics.
  3. **Preferências** – ratios, bucket rules, defaults, backups.
- **Month-level gestures**
  - Horizontal swipe on the month header moves to previous/next month in the background and animates the cards.
  - Pull-to-refresh re-syncs the local cache (still offline-first) and reveals a quick “Duplicate previous month” CTA if the upcoming month is missing.
  - Long-press the floating `+ movimento` FAB to re-open the last category/account combination.

## Month Header Component
- **Structure**: sticky 64 px bar pinned under the status bar.
  - Left chevron button ↔️ jump to previous month (disabled if oldest month).
  - Center segment: `Mês Atual` title on the first line, `Junho 2025 · Fechado`/`Aberto` status pill on the second.
  - Right chevron button ↔️ jump to next month (disabled until a future month exists).
  - Secondary row under the header: two quick actions.
    - Primary button: `Duplicar mês anterior` when viewing the future slot, otherwise `Fechar mês` (if open) or `Reabrir` (if closed).
    - Secondary ghost button: `Mover para mês atual` when browsing older history.
- **Behavior**: header remains visible while buckets scroll underneath. All calculations stay memoized so header controls never change hook order when the component re-renders.

## Main Screen Layout (Hoje tab)
1. **Month Header (sticky)** – as above.
2. **Overview chips (2-column grid)** – `Disponível`, `Poupado`, `Cartão Refeição`, `Cartão Crédito`. Each chip shows start balance, spent, and remaining; tap opens detailed sheet.
3. **Buckets rail (compact cards)** – horizontally scrollable at the top of the content with six compact cards (Conta, Refeição, Lazer, Shit Money, Poupança, Crypto). Each card: remaining € in bold, mini progress bar, and pill status (On track / Atenção / Excedido). Long-press allows reordering.
4. **Buckets table (accordion)** – collapsible section listing all categories grouped by bucket. Rows show `Categoria · gasto / meta · restante`. Tapping the remaining amount opens inline keypad.
5. **Sugestões de poupança** – dynamic list of up to two rule-based messages with actionable CTA (e.g., `Transferir €40 para Poupança`). Dismiss hides until next rule trigger.
6. **Histórico rápido** – last four movements with account icon, amount, and tap-to-edit.
7. **Floating `+ movimento` button** – anchored bottom-right (56 px), always visible thanks to safe-area aware offset. Expands to a bottom sheet capture form.

### Notes on Compact Information
- Use two-column grids for chips and pair each card with micro labels to avoid wrapping.
- Collapse completed bucket groups by default after midday to keep the screen short.
- Replace long tables with pill badges and progress bars sized 4 px height to indicate status without consuming vertical real estate.
- Sticky FAB ensures capture is always one tap; hide only when keyboard is open.

## Add-Movement Modal
- **Entry type selector** at the top (Despeza · Receita · Transferência) using pill toggles.
- **Quick categories** row with up to six adaptive chips: last three categories + pinned favorites (Lazer, Comida, Renda).
- **Amount keypad** fills the lower half; supports direct typing and +/− step buttons.
- **Source selector** (Conta, Refeição, Poupança, Crypto, Shit Money, Lazer) as segmented buttons with balance preview.
- **Date & nota** collapsed under “Detalhes”. Default date = today; previous date remembered until reset.
- **Primary CTA**: `Registar movimento` with summary line (“-€18 · Lazer via Cartão Crédito”). Confirmation triggers haptic and auto-dismiss in <300 ms.

## Month Lifecycle Logic
- **Open / Duplicate month**
  - One visible CTA: `Duplicar mês anterior`. Pressing clones last month’s plan, carries ratios, and seeds fixed expenses. Modal asks only for adjustments to starting balances if needed.
- **Close month**
  - Triggered from header or checklist card.
  - Step 1 summary: totals for Entradas, Despesas, Poupança, Resultado.
  - Step 2 prompt: “Mover €XX sobrante para Poupança?” with quick responses (`Mover tudo`, `Mover parte`, `Manter nas contas`). If accepted, auto-creates transfer movements.
  - Step 3 confirmation: lock month, add optional note. After locking, inline toast explains how to reopen.

## Financial Summaries
- **Monthly**: hero chips show `Disponível`, `Gasto`, `Poupança`, `Investido`. Buckets display `Meta vs Real vs Restante` with status color.
- **Global** (Meses tab): timeline cards summarizing each month’s net, savings rate, and leftover distribution. Filter chips at top (Essenciais / Estilo de vida / Investimento).

## Visual System
- **Color palette**
  - Background: `#0F1115` (deep neutral).
  - Card surface: `#161921`.
  - Primary accent: `#4D8CFF` (actions, progress bars).
  - Secondary accent: `#47C5A2` (positive states), `#FFB84D` (warnings), `#FF6B6B` (overspend alerts).
  - Text: `#F4F7FB` primary, `#9AA5B5` secondary, `#5B6572` dividers.
- **Typography**
  - Font: SF Pro Text (Dynamic Type). Headline 20 pt for balances, 16 pt titles, 13 pt captions.
  - Numbers use tabular figures and subtle letter-spacing (-1%).
- **Spacing & Shape**
  - 8 px base grid; chips 12 px internal padding.
  - Card radius 14 px; FAB radius 28 px.
  - Progress bars height 4 px with rounded ends.

## Interaction Design & Feedback
- **One-tap capture**: FAB opens modal already focused on amount field; recent category chip auto-populates source/bucket to reduce taps.
- **Inline edits**: tapping remaining value in bucket row slides up mini keypad. Saving plays haptic `success` and animates progress bar.
- **Month transitions**: swiping header triggers slide animation with fade of content; ensures state persists offline.
- **Reduced motion**: respect `prefers-reduced-motion` by replacing transitions with opacity fades.
- **Undo & confirmation**: after saving or closing month, show 6 s snackbar with Undo.

## Accessibility & Simplicity Improvements
- Maintain 4.5:1 contrast on all text vs background; use accent color only when contrast passes WCAG AA.
- All tappable targets ≥48 × 48 pt, with trailing chevrons to hint interactivity.
- VoiceOver labels detail bucket status (“Lazer, €45 restantes de €120, 62% gasto”).
- Numeric keypad supports hardware keyboard input and announces characters for screen readers.
- Offline badge in header clarifies sync status.

## Notes for Visual Mock Generation
Generate redesigned screen mockups in flat minimal style, showing dashboard, month view, add expense modal, and close-month summary.
