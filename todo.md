# FitOne — 50-Change Execution Plan

> **Constraints:** Zero cost to operate. Free APIs only. No paid backends, no subscriptions, no API keys that cost money.
> **Target users:** Complete beginners → intermediate lifters → advanced athletes → IFBB pro competitors
> **Philosophy:** Maximum utility. Every feature must serve at least one experience level without alienating others.

---

## Phase 0 — Kinetic Obsidian UI Refactor ✅ COMPLETE

> "The Neon Monolith" — full visual overhaul to the Kinetic Obsidian design system.

### Design System Foundation
- [x] **Brand Tokens Overhaul** — Replaced `#6C63FF` indigo with `#8B5CF6` vibrant purple palette
- [x] **Surface System** — Added 7-tier obsidian surface layering (void → lowest → low → mid → high → highest → bright)
- [x] **Typography** — Migrated from Inter to **Space Grotesk** with editorial uppercase labels + tight letter-spacing
- [x] **No-Border Rule** — Removed ALL `border: 1px solid` declarations, replaced with tonal background shifts
- [x] **Gradient System** — Added `--gradient-primary` (135° #8455ef → #ba9eff) for primary actions
- [x] **Material Symbols** — Added Google Material Symbols Outlined icon font

### Navigation Restructure (7 → 4 tabs)
- [x] **Bottom Nav** — Glassmorphic rounded nav with 4 tabs: Dashboard / Workouts / Stats / Profile
- [x] **Tab Mapping** — Today→Dashboard, Log→Workouts, Analytics→Stats, Settings→Profile
- [x] **Hidden Panels** — Protocols and Data panels still accessible via internal navigation
- [x] **Active State** — Purple background-highlight + icon glow for active tab

### Component-Level Changes
- [x] **Cards** — Borderless "obsidian slabs" with purple ambient glow on hover
- [x] **Header** — Sticky glassmorphic header with "FITONE" purple gradient brand text
- [x] **Buttons** — Gradient fills, uppercase text, 1rem border-radius
- [x] **Inputs** — Bottom-border-only "monolith input" style with purple focus glow
- [x] **Sub-tabs** — Purple gradient active state, no borders
- [x] **Modals** — Frosted glass backdrop, 1.5rem rounded top corners
- [x] **Streak Card** — Italic number, purple fire glow (replaces orange)
- [x] **Toast Notifications** — Glassmorphic with purple glow
- [x] **FAB** — Larger 56px, gradient fill, stronger ambient shadow
- [x] **Toggle Switches** — Purple accent for on-state
- [x] **List Items** — Spacing-based separation (no border-bottom dividers)
- [x] **Insights** — Tonal backgrounds only, no accent borders
- [x] **Tags/Chips** — Borderless with tonal backgrounds

---

## Phase R — Full Wireframe UI Redesign (Shipped Panels First)

> Objective: Apply exact wireframe design language across current shipped panels before deeper function-level rewiring.

- [x] **R1 — Foundation Tokens + Shell Primitives (Start Implementation)**
  - Added explicit wireframe token layer and utility primitives in `styles/main.css`
  - Updated shell visual foundations (header/nav/card baseline) toward wireframe parity
  - Replaced initial inline layout styling in `index.html` with reusable classes (`water-ring-row`, `wellness-scale-note`)

- [x] **R2 — Dashboard Visual Parity Pass (No Logic Rewrites)**
  - Apply exact dashboard spacing, surface hierarchy, labels, and card framing to match wireframe
  - Remove dashboard-specific inline styles from `index.html`

- [x] **R3 — Workouts / Stats / Profile Visual Parity Passes**
  - Complete UI parity slices per panel before function-contract refactors

---

## Phase W — Wireframe Feature Implementation

> Every feature visible in the 21 wireframe screens, adapted for FitOne's zero-cost architecture.
> **Skipped wireframes:** `authentication` (no backend), `subscription_paywall` (everything free).
> **Social features:** Adapted from multi-user to local-only (personal activity feed, self-share cards).

---

### W1. Welcome / Landing Screen (`welcome_screen`)

> First-launch only. After onboarding completes, the user never sees this again.

- [x] **W1.1 — Welcome Screen HTML**
  - Full-viewport landing page with FITONE branding
  - Hero section: "IGNITE YOUR POTENTIAL" headline (large italic display text)
  - Subtitle: "Experience the next evolution of performance tracking..."
  - "GET STARTED →" gradient CTA button → links to onboarding wizard
  - "LOG IN" text link below → for FitOne this becomes "I Have Existing Data" → trigger JSON import
  - **Add file:** welcome section in `index.html` (hidden after first launch)
  - **Modify:** `src/main.js` → check `localStorage` for `ft_onboarding_complete` flag

- [x] **W1.2 — Feature Showcase Cards**
  - "ENGINEERED PRECISION" uppercase label
  - "A Terminal For Your Physical Peak" editorial headline
  - 2 feature cards: "BIOMETRIC INSIGHTS" + "KINETIC VELOCITY" (icon + title + description)
  - **Modify:** `index.html` (static HTML within welcome panel)

- [x] **W1.3 — Local Stats Display**
  - Instead of "50k+ Active Athletes", show local stats: "X total workouts logged", "X days tracked"
  - Populate dynamically from `dataStore.js` data
  - Show "0.02s SYNC LATENCY" as "100% LOCAL • ZERO LATENCY" (brand differentiator)
  - **Modify:** `src/main.js` → `init()` populates welcome stats

- [x] **W1.4 — Welcome Screen CSS**
  - Full dark-mode hero with gradient text
  - Responsive layout, vertically-centered content
  - Smooth fade-out animation when user taps "GET STARTED"
  - **Modify:** `styles/main.css` → new `.welcome-*` rules

---

### W2. Onboarding Flow Enhancement (`select_your_goals`, `select_your_goals_v2`, `personal_metrics`)

> Upgrade existing onboarding from basic to wireframe-quality.

- [x] **W2.1 — Step Progress Indicator**
  - "STEP 01 / 04" counter in header (purple text, uppercase)
  - 4 steps: Welcome → Goal Selection → Personal Metrics → Confirmation
  - Progress bar or dot indicators at bottom of each step
  - **Modify:** `src/onboarding.js` → add step counter rendering

- [x] **W2.2 — Goal Selection Cards (wireframe style)**
  - Replace text-only buttons with large **tappable slab cards** (obsidian style)
  - Each card: icon badge (Material Symbol) + title (bold uppercase) + description (1 line)
  - Goals: **WEIGHT LOSS** (🎯 scale icon), **MUSCLE GAIN** (💪 dumbbell icon), **MAINTENANCE** (⚖️ balance icon), **PERFORMANCE** (⚡ bolt icon)
  - Selected card: purple border glow + checkmark circle badge in top-right corner
  - "DEFINE YOUR KINETIC EDGE" display title + "SELECT YOUR PRIMARY FOCUS" subtitle
  - BACK / CONTINUE button row at bottom
  - **Modify:** `src/onboarding.js` → rebuild `renderStepGoal()`

- [x] **W2.3 — Personal Metrics Step (wireframe style)**
  - "Establish Your Performance Baseline" headline with purple gradient text
  - "Input your biometric data to calibrate the kinetic engine for maximum precision." subtitle
  - Fields: **Age** (with "YRS" unit suffix), **Weight** (with "KG" unit suffix), **Height** (with "CM" unit suffix) — add Height field (not currently collected)
  - Experience Level: **BEGINNER / INTERMEDIATE / ADVANCED** segmented control (pill buttons)
  - "SYNC HEALTH DATA" button (disabled/placeholder — shows "Coming Soon" tooltip, wearable stub)
  - "Connect Apple Health or Google Fit" grey text below
  - **Modify:** `src/onboarding.js` → rebuild `renderStepProfile()`, add height to `dataStore.js` settings
  - **Modify:** `src/dataStore.js` → add `height` field to user settings schema

- [x] **W2.4 — Onboarding Completion Animation**
  - On final step, show confetti + "Your Kinetic Profile is Calibrated" success message
  - Set `ft_onboarding_complete = true` in localStorage
  - Auto-navigate to Dashboard
  - **Modify:** `src/onboarding.js` → `completeOnboarding()`

---

### W3. Dashboard v2 Enhancement (`dashboard_v2`)

> Upgrade existing Today panel to match the wireframe dashboard.

- [x] **W3.1 — Header Enhancement**
  - Add profile avatar (circular, 40px) to left of "FITONE" brand text
  - Avatar: use local image (from Photos feature) or default silhouette icon
  - Add notification bell icon (🔔 Material Symbol) to right of header → opens Pulse Center
  - **Modify:** `index.html` → header structure
  - **Modify:** `styles/main.css` → `.header` layout

- [x] **W3.2 — Personalized Greeting**
  - "READY TO PUSH?" purple uppercase label
  - "Welcome {Display Name}" large display text (Space Grotesk)
  - Pull display name from Settings profile (W16.1)
  - Default to "Welcome, Athlete" if no name set
  - **Modify:** `src/views/todayView.js` → add greeting section to `refreshToday()`

- [x] **W3.3 — Daily Energy Gauge (replace readiness)**
  - Large circular gauge (canvas-based) centered on dashboard
  - Shows percentage (e.g., "84%") in center with "DAILY ENERGY" label below
  - Multi-segment arc: green (high) → yellow (mid) → red (low)
  - Calculate from existing readiness formula (sleep + energy + soreness)
  - Animate on load (0% → actual value)
  - **Modify:** `src/ui.js` → new `drawEnergyGauge()` function (replaces or augments readiness gauge)
  - **Modify:** `src/views/todayView.js` → call new gauge function

- [x] **W3.4 — IGNITE SESSION CTA Button**
  - Large full-width gradient button: "⚡ IGNITE SESSION"
  - On tap: navigate to Workouts tab → Workout sub-tab → auto-populate from next scheduled protocol
  - If no protocol scheduled, navigate to Workout Library (W5)
  - **Modify:** `index.html` → add button after streak card
  - **Modify:** `src/views/todayView.js` → add click handler

- [x] **W3.5 — Next Workout Preview Card**
  - Shows next scheduled workout from protocols
  - Card content: category tag ("HIGH INTENSITY"), workout name ("Hyper-Growth Legs"), duration ("55m"), level ("Advanced")
  - Play button (▶) icon on right
  - "Next Workout" header with "VIEW ALL" link → goes to Workout Library (W5)
  - If no protocols exist: show "Create Your First Routine →" link
  - **Modify:** `src/views/todayView.js` → new `renderNextWorkout()` function
  - **Modify:** `src/dataStore.js` → query next protocol workout

- [x] **W3.6 — Bottom Stat Boxes (Avg Heart Rate + Calorie Burn)**
  - Two stat boxes side by side at bottom of dashboard
  - Box 1: "AVG HEART RATE" → show "—" or "N/A" (needs wearable, show placeholder)
  - Box 2: "CALORIE BURN" → show today's total workout calories burned (from logged workouts)
  - Use existing stat-box CSS class
  - **Modify:** `src/views/todayView.js` → render at bottom of `refreshToday()`

---

### W4. Workout Library (`workout_library_v3`)

> Brand new screen — browsable gallery of workout routines.

- [x] **W4.1 — Workout Library Panel**
  - New panel: `panel-library` (accessible from Dashboard's "VIEW ALL" or Workouts tab sub-nav)
  - "WORKOUT LIBRARY" large display title
  - Or: add as a new sub-tab under Workouts (Food | Workout | Body | **Library**)
  - [x] **Modify:** `index.html` → add panel or sub-tab
  - [x] **Modify:** `src/main.js` → add panel activation

- [x] **W4.2 — Search Bar**
  - Search input: "Search routines, muscle groups..."
  - Filter through user protocols + bundled starter routines
  - Debounced, case-insensitive search on name + tags
  - [x] **Modify:** `index.html` → search input
  - [x] **Modify:** new function in `src/views/protocolsView.js` or new file

- [x] **W4.3 — Filter Chips**
  - Horizontal scrollable chip row: ALL | SAVED | STRENGTH | ENDURANCE | HIIT | RECOVERY
  - Chips filter the routine list by workout type tag
  - Active chip: purple gradient background
  - [x] **Modify:** `index.html` + CSS

- [x] **W4.4 — Featured Workout Hero Card**
  - Large card at top with background gradient/pattern (topographic or muscle illustration)
  - Shows: "PREMIUM ROUTINE" badge, workout name (large text), metadata row (duration, body focus, level)
  - "START NOW ▶" gradient CTA button
  - Rotates through user protocols or shows a bundled suggested routine
  - [x] **Modify:** `src/views/protocolsView.js` → `renderFeaturedRoutine()`

- [x] **W4.5 — Routine List Cards**
  - Vertical list of routine cards, each showing:
    - Circular or rounded-rect illustration (exercise-themed icon or generated image)
    - Routine name (bold), description (1 line), level tag (Begin/Mid/Pro/Any), category tag (HIIT/STABILITY/POWER/RECOVERY)
  - Tap card → opens Routine Detail (exercise list)
  - [x] **Modify:** `src/views/protocolsView.js` → new `renderRoutineCards()` function

- [x] **W4.6 — Bundled Starter Routines**
  - Ship 5-6 pre-built routines:
    - **HyperStrength V1** (Full Body, Advanced, 75 min)
    - **Kinetic Cardio** (HIIT, Mid, 30 min)
    - **Axial Core** (Stability, Beginner, 25 min)
    - **Titan Lower** (Power, Pro, 60 min)
    - **Neural Flow** (Recovery, Any, 20 min)
  - Store as JSON in `src/exerciseDatabase.js` or new file
  - User can import any into their own protocols
  - [x] **Add file:** `src/starterRoutines.js` (bundled routine definitions)

- [x] **W4.7 — FAB Button on Library**
  - "+" FAB to create new routine → opens Protocol Builder modal
  - Same FAB behavior as existing, but contextual to library view
  - [x] **Modify:** `src/main.js` → FAB context awareness

---

### W5. Exercise Detail Drill-Down (`exercise_detail_v2`)

> A detailed view when tapping an exercise from library or workout log.

- [x] **W5.1 — Exercise Detail Modal/Panel**
  - Fullscreen overlay or slide-up panel
  - Back arrow (←) in header to return to previous view
  - "COMPOUND MOVEMENT" or "ISOLATION MOVEMENT" category badge (green dot + uppercase)
  - Exercise name: large Space Grotesk display text
  - Description: 1-2 sentence summary from Wger API or bundled data
  - **Add file:** `src/views/exerciseDetailView.js`
  - **Modify:** `index.html` → modal container or new panel

- [x] **W5.2 — PR & Last Session Stats**
  - Two stat circles side by side:
    - "PERSONAL BEST" → e.g., "125 KG" (from `prTracker.js` data)
    - "LAST SESSION" → e.g., "110 KG" (from most recent workout log)
  - **Modify:** `src/views/exerciseDetailView.js` → pull from `prTracker.js` and `dataStore.js`

- [x] **W5.3 — Primary Activation Muscle Map**
  - Left side: list of muscle groups with percentage bars
    - e.g., "Pectoralis Major — 95%", "Triceps Brachii — 70%", "Anterior Deltoids — 45%"
  - Right side: human body silhouette SVG with highlighted muscles
  - Data source: Wger API exercise muscle groups (free) + bundled fallback
  - **Add file:** `assets/body-outline.svg` (front/back body outline)
  - **Modify:** `src/views/exerciseDetailView.js` → `renderMuscleMap()`
  - **Execution checklist (migrated from `ulti-plan.md`):**
    - [x] Add `assets/body-outline.svg` with mobile-friendly, stylable silhouette classes
    - [x] Add `getMuscleActivationData(exerciseName, info)` resolver with bundled fallback behavior
    - [x] Add `renderMuscleMap(exerciseName, info)` and integrate block into exercise detail modal
    - [x] Add muscle-map layout/progress-bar/silhouette styles in `styles/main.css`
    - [x] Validate both entry points (Library exercise tap + Workout Log info button)
    - [x] Run diagnostics on changed files and mark W5.3 complete only after passing checks
  - **W5.3 acceptance criteria:**
    - [x] Exercise detail shows a visible Primary Activation section
    - [x] At least 3 muscle rows render with percentages and progress bars
    - [x] Body silhouette panel renders on desktop and mobile
    - [x] No new diagnostics errors in changed files
    - [x] W5.3 checkbox marked complete after browser validation

- [x] **W5.4 — Execution Protocol (Form Tips)**
  - Step-by-step form instructions (numbered 01, 02, 03...)
  - Each step: title (bold) + description paragraph
  - Bundled as JSON data per exercise (top 200 exercises)
  - Collapsible section — not forced on experienced users
  - **Modify:** `src/exerciseDatabase.js` → add `formTips` array to exercise entries

- [x] **W5.5 — Performance Index Chart**
  - Canvas chart showing exercise performance over time
  - Toggle between: "VOLUME" | "1RM EST." | "MAX EFFORT"
  - Volume = total weight × reps per session
  - 1RM Est = Epley formula result per session
  - Max Effort = heaviest single set
  - Date axis: last 6 sessions or selected time range
  - **Modify:** `src/views/exerciseDetailView.js` → `renderPerformanceChart()`
  - **Modify:** `src/ui.js` → reuse existing chart drawing utilities

- [x] **W5.6 — "START WORKOUT WITH THIS LIFT" CTA**
  - Full-width gradient button at bottom
  - Creates a new workout with this exercise pre-loaded → navigate to Workout form
  - **Modify:** `src/views/exerciseDetailView.js` → handler links to `logView.js`

---

### W6. Routine Builder Enhancement (`routine_builder_v2`)

> Upgrade existing protocol creation with wireframe-quality UX.

- [x] **W6.1 — Editorial Empty State**
  - When protocol has no exercises yet:
    - Large dumbbell icon (Material Symbol, 80px, centered)
    - "Build Your Arsenal" headline
    - "Design a precision workout template tailored for peak performance. Start by adding your first exercise below." description
  - **Modify:** `src/views/protocolsView.js` → empty state rendering in protocol modal

- [x] **W6.2 — Editable Routine Title Field**
  - "ROUTINE TITLE" uppercase label
  - Large placeholder text: "UNTITLED SEQUENCE" (italic, faded)
  - Text input that becomes the protocol name
  - **Modify:** `src/views/protocolsView.js` → protocol modal title field

- [x] **W6.3 — Suggested Modules Section**
  - Below exercise list, show "SUGGESTED MODULES" section
  - 3 module cards (numbered 01, 02, 03):
    - **Hyper-Growth** ⚡ — "Pre-built hypertrophy sequences for maximum muscle recruitment"
    - **Kinetic Flow** ⏱️ — "Timed endurance circuits designed to optimize metabolic rate"
    - **Iron Core** 🛡️ — "Heavy-duty compound lifts for foundational power and stability"
  - Tapping a module inserts its exercises into the protocol
  - **Modify:** `src/views/protocolsView.js` → `renderSuggestedModules()`
  - **Modify:** `src/starterRoutines.js` → export module definitions

---

### W7. Rest Timer Overhaul (`rest_timer`)

> Transform existing basic timer into fullscreen workout timer overlay.

- [x] **W7.1 — Fullscreen Timer Overlay**
  - When timer starts, show fullscreen overlay (covers workout form)
  - Dark background with "RECOVERY PHASE" uppercase label at top
  - **Large circular countdown** in center:
    - 250px diameter circle ring (canvas or SVG)
    - Countdown number inside: "00:44" (large display font, ~5rem)
    - Ring progress animation: fills/depletes in purple as time decreases
  - **Modify:** `src/views/logView.js` → `startTimer()` opens overlay
  - **Modify:** `styles/main.css` → `.timer-overlay` fullscreen styles
  - **Modify:** `index.html` → add timer overlay container

- [x] **W7.2 — Skip Rest Button**
  - "SKIP REST >>" full-width gradient button below timer circle
  - Immediately ends rest period, hides overlay
  - **Modify:** `src/views/logView.js` → `skipRest()` handler

- [x] **W7.3 — Next Set Preview Card**
  - Below skip button, show card with:
    - "NEXT SET" green badge + "SET 3 OF 4" label
    - Exercise name (bold): "Incline Dumbbell Press"
    - Exercise icon (dumbbell Material Symbol)
    - Target: "🏋️ 32.5 kg  •  🔄 10 Reps"
  - Data: pull from current workout's exercise rows
  - **Modify:** `src/views/logView.js` → `renderNextSetPreview()`

- [x] **W7.4 — Form Tip in Timer**
  - Small card with exercise-specific form tip
  - "Focus on slow eccentric movement and explosive push."
  - Pull from exercise database form tips (W5.4)
  - **Modify:** `src/views/logView.js` → include form tip in overlay

- [x] **W7.5 — Live Stat Boxes**
  - Bottom of timer overlay: two stat boxes
  - "HEART RATE" → show "— BPM" (placeholder, future wearable)
  - "CALORIES" → show estimated calories so far (duration × avg burn rate)
  - **Modify:** `src/views/logView.js` → calculate running calorie estimate

---

### W8. Post-Workout Summary (`post_workout_summary`)

> Brand new screen shown after logging a workout.

- [x] **W8.1 — Session Complete Banner**
  - Large gradient card at top:
    - "SESSION COMPLETE" uppercase purple label
    - Workout name in huge display text (e.g., "PULL DAY AESTHETICS")
    - Stat row: DURATION ("1H 24M") + CALORIES ("642")
    - Total volume badge: green pill "22,450 KG TOTAL"
    - PR count: "🏆 3 NEW PERSONAL RECORDS"
  - **Add file:** `src/views/postWorkoutView.js`
  - **Modify:** `index.html` → post-workout overlay/modal

- [x] **W8.2 — PR Achievements Section**
  - "PR ACHIEVEMENTS" heading with trend icon (📈)
  - List of exercise PRs detected during this workout:
    - Exercise icon + name + new PR value
    - Delta vs previous: "+15 KG vs last month" (green text)
    - PR type: "ENDURANCE PR", "VOLUME PR", "WEIGHT PR"
  - **Modify:** `src/views/postWorkoutView.js` → `renderPRs()`
  - **Modify:** `src/prTracker.js` → return detected PRs from `checkAndStorePRs()`

- [x] **W8.3 — Muscle Focus Map**
  - "FOCUS" section with background muscle illustration
  - "Intensity map by muscle group" subtitle
  - Horizontal bars: "LATS 92%", "BICEPS 78%", "RHOMBOIDS 85%"
  - Calculate from exercises logged × muscle group tags
  - **Modify:** `src/views/postWorkoutView.js` → `renderMuscleFocusMap()`

- [x] **W8.4 — Work Log (Set-by-Set Breakdown)**
  - "WORK LOG" section
  - Per exercise: name (bold) + set count badge + set table (SET | WEIGHT | REPS | RPE)
  - Color RPE values: 7 (green), 8.5 (yellow), 10 (red)
  - "View full breakdown in activity history..." link at bottom
  - **Modify:** `src/views/postWorkoutView.js` → `renderWorkLog()`

- [x] **W8.5 — Share & Done Buttons**
  - Bottom bar: "↗ SHARE" text button (left) + "✅ DONE" gradient button (right)
  - SHARE → open Share Flex view (W12)
  - DONE → dismiss summary, return to Dashboard
  - **Modify:** `src/views/postWorkoutView.js` → button handlers

- [x] **W8.6 — Trigger Post-Workout Summary**
  - After `logWorkout()` succeeds, auto-show post-workout summary instead of just a toast
  - Pass workout data + detected PRs to the new view
  - **Modify:** `src/views/logView.js` → `logWorkout()` → call `showPostWorkoutSummary(data)`

---

### W9. Stats Hub v2 Enhancement (`stats_hub_v2`)

> Upgrade existing analytics tab to match wireframe design.

- [x] **W9.1 — Stats Hub Title Treatment**
  - "PERFORMANCE ANALYTICS" uppercase purple subtitle
  - "Stats Hub" large display title
  - **Modify:** `index.html` → add heading above sub-tabs in `panel-analytics`

- [x] **W9.2 — Time Range Selector**
  - Pill-button row: "3 MONTHS" | "6 MONTHS" | "1 YEAR"
  - Selected pill: purple gradient background
  - All analytics charts update to selected time range
  - Currently hardcoded to 14 days — make fully dynamic
  - **Modify:** `src/views/analyticsView.js` → add `timeRange` state + filter logic
  - **Modify:** `index.html` → add time range pill buttons

- [x] **W9.3 — Total Tonnage Card**
  - Large featured card at top of stats:
    - "Total Tonnage" title + description ("Cumulative volume lifted across all muscle groups")
    - Large green number (e.g., "142.5 TONS")
    - Trend delta: "+12% vs last period" (green text)
    - Line chart below showing tonnage trend over selected range
  - **Modify:** `src/views/analyticsView.js` → new `renderTotalTonnage()` function

- [x] **W9.4 — Personal Record Highlight Cards**
  - 2 PR cards below tonnage:
    - Each shows: icon + "PERSONAL RECORD" label + exercise name + PR value + status badge
    - Status: "NEW HIGH" (green) or "STABLE" (grey) + time ago ("2 days ago")
  - Pull from `prTracker.js` → latest PRs
  - **Modify:** `src/views/analyticsView.js` → `renderPRHighlights()`

- [x] **W9.5 — Weekly Consistency Heatmap**
  - GitHub-style contribution grid
  - 12 weeks × 7 days = 84 cells
  - Color intensity: no data (dark) → light purple → full purple
  - Based on whether any workout/food was logged that day
  - Scale legend: "LESS" → "MORE"
  - "94% Target Consistency" stat below
  - "DOWNLOAD REPORT" button (export CSV/JSON for the period)
  - **Modify:** `src/views/analyticsView.js` → `renderConsistencyHeatmap()`
  - **Modify:** `src/ui.js` → new `drawHeatmap()` utility

---

### W10. Deep Dive Metric — Per-Exercise Analytics (`deep_dive_metric`)

> Drill-down view for analyzing a single exercise's performance over time.

- [x] **W10.1 — Deep Dive Panel/Modal**
  - Accessible from: Exercise Detail (W5), Stats Hub PR cards (W9.4), or Post-Workout PRs (W8.2)
  - Header: back arrow + "PERFORMANCE HIGH" badge + breadcrumb ("UPPER BODY • STRENGTH")
  - Exercise name + "Trend" suffix: "BENCH PRESS TREND"
  - AI-style description: "Analyzing explosive power and mechanical consistency across the last 180 days..."
  - **Add file:** `src/views/deepDiveView.js`

- [x] **W10.2 — Multi-Metric Chart**
  - Time range pills: 3 MONTHS | 6 MONTHS | 1 YEAR
  - Line chart with up to 3 overlaid series:
    - "Estimated 1RM (KG)" — Epley formula result per session
    - "Strength Peak" — heaviest set per session
    - "Volume Load" — total volume per session
  - Toggle series visibility via legend buttons
  - **Modify:** `src/views/deepDiveView.js` → canvas chart
  - **Modify:** `src/ui.js` → multi-line chart utility

- [x] **W10.3 — Intensity Gauge**
  - "CURRENT INTENSITY" card
  - Circular or horizontal gauge: "88% HYPERTROPHY"
  - Calculated from recent session RPE averages and rep ranges
  - **Modify:** `src/views/deepDiveView.js` → `renderIntensityGauge()`

- [x] **W10.4 — Quick Stat Cards**
  - Grid of 4 stat cards:
    - "SESSION VOLUME" — "12,450 KG" with "+12% vs LY" delta
    - "ALL-TIME MAX" w/ "P.R. STATUS" badge — "145.0 KG" with date
    - "AVG. INTENSITY" w/ "OUTPUT RATING" badge — "82.4 %" with context note
    - "WEEKLY FREQUENCY" w/ "CONSISTENCY" badge — "2.4 SESS" with streak note
  - **Modify:** `src/views/deepDiveView.js` → `renderStatCards()`

---

### W11. Activity Feed — Local Timeline (`activity_feed`)

> Personal activity timeline (adapted from social feed wireframe — no multi-user).

- [x] **W11.1 — Activity Feed Panel**
  - New sub-tab or view accessible from Dashboard
  - "Activity Feed" scrollable timeline of all logged events
  - Event types: Workout completed, Food logged (daily summary), Body measurement, PR achieved, Achievement unlocked, Streak milestone
  - **Add file:** `src/views/activityFeedView.js`
  - **Modify:** `index.html` → sub-tab or accessible via Dashboard card

- [x] **W11.2 — Activity Post Cards**
  - Each card shows:
    - Activity icon + title + timestamp ("22m ago")
    - Context: gym name/location if set, or just "FitOne"
    - Content varies by type:
      - **Workout:** "ELITE PERFORMANCE" badge + workout name + volume/time/intensity
      - **PR:** "⚡ PR: 185KG SQUAT" badge + description
      - **Food:** daily calorie summary card
      - **Body:** measurement snapshot
  - **Modify:** `src/views/activityFeedView.js` → `renderActivityCards()`
  - **Modify:** `src/dataStore.js` → unified `getRecentActivity()` query across all data types

- [x] **W11.3 — Activity Card Interactions**
  - Tap card → navigate to relevant detail view (workout detail, exercise detail, etc.)
  - No likes/comments (no multi-user), but show "🔥 Personal Best!" badges on PR activities
  - **Modify:** `src/views/activityFeedView.js` → click handlers

---

### W12. Share Flex Enhancement (`social_flex_v3`)

> Upgrade existing share card generator to match wireframe design.

- [x] **W12.1 — Branded Share Card Design**
  - Full-screen share card preview:
    - Topographic pattern background (SVG or canvas-generated)
    - "WORKOUT COMPLETE" uppercase purple label
    - Workout name in huge italic display text
    - Stats: ⏱️ duration + 🏋️ total weight
    - "2 NEW PRs" badge (if applicable)
  - Rounded card shape (large border-radius)
  - **Modify:** `src/shareCard.js` → `generateShareCard()` redesign

- [x] **W12.2 — Share Action Buttons**
  - Bottom row: 3 actions
    - "SAVE" (download icon) → Canvas-to-PNG download (already exists)
    - "INSTAGRAM" (share icon, purple gradient) → attempt `navigator.share()` for native sharing
    - "COPY" (link icon) → copy workout summary text to clipboard
  - **Modify:** `src/shareCard.js` → add Instagram share + clipboard copy

---

### W13. Workout Detail View (`social_detail_v3` adapted)

> Read-only drill-down into a logged workout (adapted from social detail wireframe).

- [x] **W13.1 — Workout Detail Panel**
  - Accessible by tapping any workout in Recent Workouts or Activity Feed
  - Header: back arrow + share icon + profile avatar
  - User info: display name + time ago + gym (if set)
  - Workout title: large italic editorial text (e.g., "HYPER-TROPHY LEG DAY // 04")
  - Intensity bar (visual indicator)
  - **Add file:** `src/views/workoutDetailView.js`

- [x] **W13.2 — Summary Stat Boxes**
  - 4 stat circles/boxes:
    - DURATION (74:12), VOLUME (12,450 kg), AVG HEART (— bpm), CALORIES (642 kcal)
  - Arranged in 2×2 grid
  - **Modify:** `src/views/workoutDetailView.js` → `renderSummaryStats()`

- [x] **W13.3 — Workout Breakdown**
  - "WORKOUT BREAKDOWN" section heading
  - Per exercise card:
    - Exercise name (bold) + expand icon
    - "PRIMARY: QUADS & GLUTES" muscle tag
    - Set table: SET | WEIGHT | REPS | RPE
    - PR flag (🟣 "PR") on record-breaking rows
    - Progress bar showing % of all-time max
  - **Modify:** `src/views/workoutDetailView.js` → `renderBreakdown()`

- [x] **W13.4 — Workout Notes Section**
  - Show workout notes if any were logged
  - Styled as a quote block
  - **Modify:** `src/views/workoutDetailView.js`

---

### W14. Notification Center — Pulse Center (`notification_center`)

> Local notification center for performance alerts.

- [x] **W14.1 — Pulse Center Panel**
  - Accessible from notification bell icon in header
  - "Pulse Center" large title + "ALL PERFORMANCE ALERTS AND ACTIVITY" subtitle
  - Slide-in panel or overlay
  - **Add file:** `src/views/pulseCenterView.js`
  - **Modify:** `index.html` → pulse center container

- [x] **W14.2 — Recent Activity Notifications**
  - "RECENT ACTIVITY" green section header
  - Notification cards:
    - Purple icon badge + title + time ago ("2M AGO")
    - Description text
  - Types (all generated locally):
    - "New PR Set" — when a PR was achieved
    - "Streak Milestone" — "Don't lose your 14-day streak!"
    - "Goal Completed" — daily calorie/protein/water goal hit
    - "Achievement Unlocked" — new badge earned
  - **Modify:** `src/views/pulseCenterView.js` → `renderNotifications()`
  - **Modify:** `src/dataStore.js` → new `getNotifications()` (generates from data analysis)

- [x] **W14.3 — Performance Metrics Notifications**
  - "PERFORMANCE METRICS" purple section header
  - "Weekly Performance Summary Ready" card:
    - "Your volume is up by +12% compared to last week. Review your metabolic breakdown."
    - Mini horizontal bar chart visualization
    - "ACTION REQUIRED" badge + time ago
  - Generated weekly from analytics data
  - **Modify:** `src/views/pulseCenterView.js` → `renderPerformanceAlerts()`

- [x] **W14.4 — Notification Badge Counter**
  - Show red/purple badge with unread count on bell icon in header
  - Track "last seen" timestamp to calculate unread count
  - **Modify:** `src/main.js` → update badge count on navigation
  - **Modify:** `styles/main.css` → notification badge styles

---

### W15. App Settings Enhancement (`app_settings`)

> Add profile identity and enhanced settings sections.

- [x] **W15.1 — Profile Identity Section**
  - "PROFILE IDENTITY" uppercase section header
  - Centered profile avatar (120px circular) with purple edit button overlay
  - Avatar: camera capture or file upload → store as base64 in localStorage
  - "DISPLAY NAME" input: text field for user's name
  - "KINETIC BIO" textarea: short personal bio/description
  - Save to `dataStore.js` → `settings.displayName`, `settings.bio`, `settings.avatar`
  - **Modify:** `index.html` → add profile section to `panel-settings`
  - **Modify:** `src/views/settingsView.js` → render and save profile data
  - **Modify:** `src/dataStore.js` → add profile fields to settings schema

- [x] **W15.2 — System Calibration Section**
  - "SYSTEM CALIBRATION" uppercase section header
  - Preferred Units: existing KG/LB toggle → restyle as segmented pill buttons (KG highlighted in purple, LB in dark)
  - "Kinetic Mode" → existing dark mode toggle → rename label + add "Obsidian Theme" subtitle
  - **Modify:** `src/views/settingsView.js` → update labels
  - **Modify:** `index.html` → restructure settings cards

- [x] **W15.3 — Notification Pulse Section**
  - "Notification Pulse" section with icon
  - "Push Notifications" toggle — enable browser Notification API (free, local)
  - Show subtitle: "Real-time performance alerts"
  - Actually request `Notification.requestPermission()` on toggle on
  - "Email Summaries" toggle — disabled with "Coming Soon" badge
  - **Modify:** `src/views/settingsView.js` → notification toggle handlers
  - **Modify:** `src/dataStore.js` → add `settings.pushNotifications` flag

- [x] **W15.4 — Privacy & Safety Section**
  - "Privacy & Safety" section with shield icon
  - "Data Syncing" → chevron → links to Data Studio (existing export panel)
  - Remove "Profile Visibility" (no social backend)
  - **Modify:** `index.html` → add section
  - **Modify:** `src/views/settingsView.js`

- [x] **W15.5 — Terminate Session / Clear Data**
  - Replace "TERMINATE SESSION" with "CLEAR ALL DATA" danger button
  - Confirmation dialog before wiping localStorage
  - Links to existing delete-all functionality
  - **Modify:** `index.html` → add button
  - **Modify:** `src/views/settingsView.js`

---

### W16. Workout Settings (`workout_settings`)

> Dedicated workout configuration page.

- [x] **W16.1 — Workout Settings Panel**
  - Accessible from Workouts tab → gear (⚙️) icon or from App Settings
  - "Workout Settings" display title + "OPTIMIZE YOUR TRAINING PRECISION" subtitle
  - **Add file:** `src/views/workoutSettingsView.js` (or integrate into settingsView)
  - **Modify:** `index.html` → new panel or section

- [x] **W16.2 — Default Rest Timer Configuration**
  - "Default Rest Timers" heading with timer icon + current value display ("90s")
  - Range slider: 30s ↔ 300s (in 15s increments)
  - Tick marks: 30 SEC | 180 SEC | 300 SEC
  - Info tooltip: "Timers will auto-start after finishing a set. You can override this per exercise in the workout view."
  - Save to `settings.defaultRestTime`
  - **Modify:** `src/dataStore.js` → add default rest time setting
  - **Modify:** `src/views/logView.js` → use default rest time instead of hardcoded presets

- [x] **W16.3 — Plate System Selector**
  - "Plate System" heading with dumbbell icon
  - Segmented toggle: "45LB" | "20KG"
  - Subtitle: "Selected: Standard Olympic Cast Iron"
  - Used for plate calculator feature (calculate plates needed for target weight)
  - Save to `settings.plateSystem`
  - **Modify:** `src/dataStore.js` → add plate system setting

- [x] **W16.4 — Auto-Lock Toggle**
  - "Auto-Lock" toggle with description: "Prevent accidental screen taps during active sets"
  - When enabled: during rest timer, overlay blocks accidental form interactions
  - "ACTIVE SETS ONLY" checkbox (sub-option)
  - **Modify:** `src/views/logView.js` → lock behavior during timer

- [x] **W16.5 — Automation Toggles**
  - "AUTOMATION" section header (purple)
  - "Auto-Advance Exercises" toggle — after completing all sets, auto-scroll to next exercise
  - "VISUALS" section header (purple)
  - "Dark Mode Focus Mode" toggle — dims all UI except active exercise during workout
  - "AUDIO" section header (purple)
  - "Voice Countdown" toggle — use Web Speech API (free) for "3... 2... 1..." countdown
  - "SAVE CHANGES" gradient button + "RESET" ghost button
  - **Modify:** `src/dataStore.js` → new workout settings fields
  - **Modify:** `src/views/logView.js` → implement auto-advance and focus mode behaviors

---

### W17. Navigation Update — 5th Tab Consideration

> Several wireframes show a "Social" tab. Adapt for local-only.

- [x] **W17.1 — Feed/Social Tab Decision**
  - Wireframes show 4-tab: Feed | Stats | Workout | Profile (or variations with Social)
  - Current: Dashboard | Workouts | Stats | Profile
  - **Option A:** Keep 4 tabs, add Activity Feed as Dashboard sub-view
  - **Option B:** Expand to 5 tabs: Dashboard | Workouts | Stats | Feed | Profile
  - User decision required — default to Option A for cleanliness
  - **Modify:** `index.html` → tab bar
  - **Modify:** `src/main.js` → tab switching
  - **Modify:** `styles/main.css` → tab bar grid (4-col or 5-col)

---

### Implementation Priority Order

| Priority | Group | Effort | Impact |
|----------|-------|--------|--------|
| 🔴 P0 | W3 Dashboard v2 | Medium | Highest — first thing user sees |
| 🔴 P0 | W2 Onboarding Enhancement | Medium | Critical for first-time UX |
| 🔴 P0 | W8 Post-Workout Summary | Medium | Major engagement driver |
| 🟠 P1 | W7 Rest Timer Overhaul | Medium | In-workout experience |
| 🟠 P1 | W9 Stats Hub v2 | Large | Analytics upgrade |
| 🟠 P1 | W5 Exercise Detail | Large | Knowledge depth |
| 🟠 P1 | W15 App Settings | Medium | Profile & personalization |
| 🟡 P2 | W4 Workout Library | Large | Routine discovery |
| 🟡 P2 | W6 Routine Builder | Small | Protocol UX upgrade |
| 🟡 P2 | W12 Share Flex | Small | Social sharing |
| 🟡 P2 | W13 Workout Detail | Medium | Historical review |
| 🟡 P2 | W16 Workout Settings | Medium | Training customization |
| 🟡 P2 | W1 Welcome Screen | Small | First impression |
| 🟢 P3 | W10 Deep Dive Metric | Large | Advanced analytics |
| 🟢 P3 | W11 Activity Feed | Medium | Personal timeline |
| 🟢 P3 | W14 Notification Center | Medium | Engagement prompts |
| 🟢 P3 | W17 Nav Tab Decision | Small | Layout consideration |

---

## Cost & API Reference

| Service | Cost | Used For |
|---------|------|----------|
| [Open Food Facts API](https://world.openfoodfacts.org/data) | 100% free, open-source | Food database, barcode lookup |
| [Wger Exercise API](https://wger.de/api/v2/) | 100% free, open-source | Exercise database with muscle maps |
| [BarcodeDetector Web API](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) | Browser-native, free | Barcode scanning |
| [Leaflet + OpenStreetMap](https://leafletjs.com/) | 100% free, open-source | GPS route maps |
| [TensorFlow.js](https://www.tensorflow.org/js) | 100% free, client-side | Optional food photo estimation |
| Geolocation API | Browser-native, free | GPS tracking |
| Notification API | Browser-native, free | Local reminders |
| Vibration API | Browser-native, free | Haptic feedback |
| File System Access API | Browser-native, free | Auto-backup |
| IndexedDB | Browser-native, free | Large data storage |
| localStorage | Browser-native, free | Settings, small data |
| **No backend. No server. No hosting cost. Everything runs in the user's browser.** |||

---

## Phase 1 — Retention Essentials (Do First)

> These close the gaps that actively cause users to abandon ship.

### Food Logging & Nutrition

- [x] **#1 🔴 Barcode Scanner with Food Lookup**
  - **API:** Open Food Facts (free, no key, no rate limit for reasonable use)
  - Use `BarcodeDetector` Web API for camera scanning
  - Auto-fill: name, calories, protein, carbs, fat, serving size
  - Fallback: manual barcode entry field for devices without camera
  - **Beginner value:** Removes the #1 barrier — not knowing nutritional values
  - **Pro value:** Speed. No one wants to manually enter chicken breast for the 10,000th time
  - **New file:** `src/barcodeScanner.js`
  - **Modify:** `logView.js` — scan button next to `#foodName`

- [x] **#2 🔴 Food Search Database (Text-Based)**
  - **API:** Open Food Facts text search (free)
  - Debounced search, top 10 results, auto-fill on tap
  - Cache results in localStorage/IndexedDB — works offline after first lookup
  - Show per-100g AND per-serving values (critical for accuracy)
  - **Beginner value:** "Just search and tap" — no nutrition knowledge needed
  - **Pro value:** Custom serving multiplier for precise macro counting
  - **New file:** `src/foodDatabase.js`
  - **Modify:** `logView.js` — search dropdown below `#foodName`

- [x] **#3 🟠 Meal Templates / Saved Meals**
  - Group multiple food entries into named meals
  - Quick-add entire meal in one tap
  - Support serving multiplier (e.g., "double portion")
  - **Beginner value:** Save "My usual breakfast" once, reuse forever
  - **Pro value:** Save competition prep meals (Meal 1 through Meal 6) for contest diet
  - **New key:** `ft_meal_templates`
  - **Modify:** `logView.js`

### Workout Tracking

- [x] **#6 🔴 Built-in Exercise Database with Muscle Group Tags**
  - **API:** [Wger REST API](https://wger.de/api/v2/) (free, open-source, 600+ exercises with muscle group data and images)
  - Bundle top 200 exercises as offline fallback JSON
  - Autocomplete on exercise name fields
  - Show primary/secondary muscles, equipment needed
  - **Beginner value:** "I don't know exercise names" — browse by muscle group, see images
  - **Pro value:** Consistent naming enables accurate volume tracking and PR detection
  - **New file:** `src/exerciseDatabase.js`
  - **Modify:** `logView.js` — autocomplete on exercise name inputs

- [x] **#7 🔴 Personal Records (PR) Tracking & Alerts**
  - Compare each exercise's weight×reps against all history on log
  - Auto-detect: weight PR, rep PR, volume PR (sets×reps×weight), estimated 1RM PR
  - Trigger celebration (reuse confetti system)
  - Store in `ft_personal_records`, surface in Analytics
  - **Beginner value:** Dopamine hit from constant PRs in novice phase
  - **Pro value:** Track competition lifts, all-time bests, PRs by bodyweight class
  - **New file:** `src/prTracker.js`
  - **Modify:** `logView.js` → `logWorkout()`, `analyticsView.js`

- [x] **#9 🟠 Progressive Overload Suggestions**
  - Auto-populate exercise rows from most recent session
  - Configurable progression scheme per exercise:
    - **Beginner:** Linear (+2.5kg/session or +1 rep)
    - **Intermediate:** Double progression (hit top of rep range → add weight)
    - **Advanced:** Percentage-based, RPE-based, or wave loading
  - Show chip: "Last: 60kg × 8 → Suggested: 62.5kg × 8"
  - **Modify:** `logView.js` → `addExerciseRow()`, `dataStore.js`

### User Experience

- [x] **#39 🟠 Onboarding Flow for New Users**
  - First-launch wizard steps:
    1. Experience level (beginner / intermediate / advanced / competitor)
    2. Primary goal (lose fat / maintain / build muscle / compete)
    3. Set units (kg/lbs, cm/in)
    4. Set initial goals (calories, protein) — offer auto-suggestions based on level
    5. Optional: log starting weight and body measurements
  - Experience level unlocks appropriate UI complexity:
    - **Beginner:** Hide RPE, target weights, advanced toggles by default
    - **Advanced:** Show everything
    - **Competitor:** Show comp prep tools, multiple macro profiles
  - **New file:** `src/onboarding.js`
  - **Modify:** `main.js` → `init()`, `dataStore.js` → new `experienceLevel` setting

---

## Phase 2 — Engagement & Stickiness

> Drive daily returns, emotional connection, and long-term habit formation.

### Progress & Body Tracking

- [x] **#13 🔴 Progress Photos with Before/After Comparison**
  - Camera capture or file upload on Body tab
  - Store as base64 or blob URL with date + tags (front/side/back/most muscular/rear lat spread)
  - Side-by-side comparison slider
  - **Beginner value:** Visual proof of progress when scale doesn't move
  - **Pro value:** Posing documentation for comp prep, judge what needs work
  - `KEYS.photos` already exists — just needs UI
  - **New file:** `src/views/photosView.js`
  - **Modify:** `index.html` — sub-tab on Body panel

- [x] **#14 🟠 Body Composition Visualization (Spider Chart)**
  - Radar chart of all body measurements over time
  - Show directional arrows for each measurement
  - Symmetry analysis: left arm vs right arm, proportions
  - **Beginner value:** Makes measurement tracking feel visual and rewarding
  - **Pro value:** Symmetry is judged on stage — track and correct imbalances
  - **Modify:** `ui.js` (new chart fn), `analyticsView.js`

- [x] **#15 🟠 Interactive Chart Tooltips**
  - Touch/mouse handlers on all canvas charts
  - Tap bar/point → tooltip with exact values + date
  - Long press → compare with previous period
  - **Modify:** `drawBarChart()`, `drawLineChart()` in `ui.js`

### Social & Sharing (Zero-Cost, No Backend)

- [x] **#18 🟠 Shareable Workout Summary Cards**
  - Generate branded image card after logging workout
  - Canvas-to-PNG, download directly — no server needed
  - Include: exercises, volume, duration, PR badges, FitOne branding
  - **New file:** `src/shareCard.js`
  - **Modify:** `logView.js` post-workout flow

- [x] **#19 🟡 Achievement Badges & Milestone System**
  - 40+ achievements across all levels:
    - **Beginner:** First workout, first food log, 3-day streak, logged every meal for a day
    - **Intermediate:** 30-day streak, 100 workouts, bodyweight bench press, 1000lb total
    - **Advanced:** 365-day streak, 500 workouts, 2× bodyweight squat
    - **Competitor:** Logged full peak week, hit all 6 meals for 7 days, 16-week prep completed
  - Store in `ft_achievements`, display in gallery
  - **New file:** `src/achievements.js`

### Habit & Consistency

- [x] **#29 🟠 Daily Goal Rings**
  - 4 rings: Nutrition | Training | Hydration | Recovery
  - Track "perfect days" and "ring streaks"
  - **Beginner value:** Simple visual — "close your rings"
  - **Pro value:** Adherence tracking across all pillars of prep
  - **Modify:** `todayView.js` → `refreshToday()`

- [x] **#30 🟠 Streak Freeze / Rest Day Protection**
  - 1-2 freezes per week. Rest day with wellness check-in or body log counts
  - Configurable: "What counts as an active day?" (any log / workout only / food + workout)
  - **Beginner value:** Doesn't punish rest days — important for habit formation
  - **Pro value:** Rest days are part of the program, not a failure
  - **Modify:** `dataStore.js` → `calculateStreak()`

- [x] **#40 🟠 Quick-Log Widget**
  - FAB menu → "Quick Add" → minimal modal: name + calories + meal → done
  - Also: "Quick Water" already exists, add "Quick Bodyweight" (just weight, one field)
  - **Beginner value:** Lowest possible friction entry point
  - **Modify:** `main.js` FAB handler

---

## Phase 3 — Intelligence Layer

> Algorithmic coaching that adapts to user level and makes FitOne smarter than a spreadsheet.

### Workout Intelligence

- [x] **#8 🟠 Estimated 1RM Calculation**
  - Epley formula: `weight × (1 + reps/30)`
  - Display alongside every logged set
  - Track estimated 1RM trends per exercise over time
  - **Beginner value:** Learn what their max strength is without testing it (safer)
  - **Pro value:** Program percentages off of estimated 1RM, track strength gains in prep
  - **Add:** `calculate1RM()` in `dataStore.js`
  - **Modify:** `logView.js`, `analyticsView.js`

- [x] **#10 🟠 Volume Tracking Per Muscle Group**
  - Using exercise database muscle tags (#6)
  - Weekly sets per muscle group, with science-based volume landmarks:
    - **Minimum Effective Volume (MEV):** ~6-8 sets/muscle/week
    - **Maximum Recoverable Volume (MRV):** ~15-25 sets/muscle/week
  - Color-coded: under MEV (red) → in range (green) → over MRV (orange)
  - **Beginner value:** "Am I training enough?" — clear answer
  - **Pro value:** Volume periodization, strategic overreaching, deload timing
  - **Modify:** `analyticsView.js`, `dataStore.js`

- [x] **#11 🟡 Workout Timer with Auto-Start**
  - Auto-start rest timer after set completion (Enter key / field blur)
  - Vibration + audio on completion
  - Configurable default rest per exercise type (strength: 2-3min, hypertrophy: 60-90s)
  - **Modify:** `logView.js` → `bindExerciseInputShortcuts()`, `startTimer()`

- [x] **#12 🟡 Superset / Circuit / Drop Set Grouping**
  - "Link with next" toggle on exercise rows
  - Support types: superset, giant set, drop set, rest-pause
  - Visual bracket connector, rest between groups not exercises
  - **Beginner value:** Follow along with guided superset workouts
  - **Pro value:** Log complex intensity techniques accurately (drop sets, myo-reps, etc.)
  - **Modify:** exercise row HTML in `logView.js`

### Smart Coaching

- [x] **#25 🟠 Smart Calorie/Macro Adjustment**
  - "Sync Goal to TDEE" button when TDEE confidence is high
  - Calculate macros based on goal + bodyweight:
    - **Lose:** TDEE − 300-500, protein 2.2-2.8g/kg, fill remaining with carbs/fat
    - **Maintain:** TDEE ± 100, protein 1.8-2.2g/kg
    - **Gain:** TDEE + 200-400, protein 1.8-2.2g/kg
    - **Compete:** Support multiple daily profiles (training day / rest day / carb-up / peak week)
  - **Modify:** `dataStore.js`, `analyticsView.js`

- [x] **#26 🟡 Periodized Training Plan Generator**
  - Given a protocol, generate multi-week progression:
    - **Beginner:** Linear progression (add weight every session)
    - **Intermediate:** Weekly undulating periodization
    - **Advanced:** Block periodization (hypertrophy → strength → peaking)
    - **Competitor:** Contest prep mesocycles with deload timing
  - **New file:** `src/planGenerator.js`
  - **New key:** `ft_training_plan`

- [x] **#27 🟡 Recovery Suggestions Based on Readiness**
  - Low readiness → suggest: mobility work, light walk, yoga, foam rolling
  - Moderate → suggest: light training, skip heavy compounds
  - High → suggest: next scheduled protocol, push heavy
  - **Beginner value:** Teaches the concept of recovery and auto-regulation
  - **Pro value:** Data-driven training decisions, avoid overtraining in prep
  - **Modify:** `todayView.js` → `renderInsights()`

- [x] **#28 🟢 Food Photo Estimation (Client-Side Only)**
  - **Cost:** $0 — TensorFlow.js runs entirely in browser, no API calls
  - If `aiModulesEnabled`, add "Snap & Estimate" button
  - Load a pre-trained MobileNet food classification model (~5MB)
  - Rough food category recognition → suggest matching items from food database
  - **New file:** `src/foodVision.js`
  - **Note:** This is experimental/fun, not a replacement for manual logging

### Nutrition Intelligence

- [x] **#4 🟡 Micronutrient Tracking**
  - Additional fields: fiber (g), sugar (g), sodium (mg)
  - Auto-populate from Open Food Facts when using food database
  - Analytics sub-tab for micronutrient trends
  - **Beginner value:** Learn about nutrients beyond just calories
  - **Pro value:** Sodium/water tracking is critical for peak week
  - **Modify:** food schema in `dataStore.js`, form in `logView.js`

- [x] **#5 🟡 Recipe Builder with Macro Calculator**
  - Add ingredients (from database or manual), specify total servings
  - Auto-calculate per-serving macros
  - Save as reusable food item
  - **Beginner value:** "I cook at home but don't know the macros"
  - **Pro value:** Batch-cook meal prep — log once, reuse all week
  - **New key:** `ft_recipes`, modal in `logView.js`

---

## Phase 4 — Platform & Scale

> Prepare for large datasets, offline resilience, and optional integrations (all free).

### Architecture (Zero Cost)

- [ ] **#46 🟠 ES Modules Migration**
  - Migrate from global `<script>` tags to `import`/`export`
  - Add Vite as dev bundler (free, open-source)
  - Enables code splitting, lazy loading heavy views
  - **Refactor:** all `src/*.js`, add `vite.config.js`

- [ ] **#47 🟠 Unit Test Coverage**
  - Vitest (free) for unit tests on all `dataStore.js` pure functions
  - Streak, TDEE, readiness, plateau, 1RM, volume calcs
  - Target 90%+ coverage on data logic
  - **New dir:** `tests/unit/`

- [ ] **#36 🟡 IndexedDB Migration**
  - Move entity data from localStorage (5MB cap) to IndexedDB (hundreds of MB)
  - Keep settings in localStorage
  - Critical for users with years of data
  - **Refactor:** `loadData()`/`saveData()` in `dataStore.js`

- [ ] **#48 🟡 Virtual Scrolling for Large Lists**
  - Render only visible items + buffer in food/workout/body lists
  - Custom implementation (no external dependency needed)
  - **New file:** `src/virtualScroller.js`
  - **Modify:** `logView.js`

- [ ] **#49 🟡 Web Workers for Heavy Computation**
  - Move TDEE, readiness, meal timing to Web Workers
  - Prevents UI jank with large datasets
  - **New file:** `src/workers/analyticsWorker.js`

### Data & Sync (Zero Cost Options Only)

- [ ] **#35 🟠 Peer-to-Peer Sync (No Server Required)**
  - ~~Cloud sync with Supabase/Firebase~~ → Instead: use **WebRTC data channels** or **shared file export/import** for multi-device sync
  - Option A: QR code pairing between devices, sync via WebRTC (P2P, no server)
  - Option B: Export/import to/from user's own cloud drive (Google Drive, iCloud — they already pay for it)
  - Option C: Local network sync via Web Bluetooth or mDNS (same WiFi)
  - **Implement:** `src/syncService.js`

- [ ] **#34 🟠 Apple Health / Google Fit Integration**
  - Free APIs (Apple HealthKit, Google Fit REST API with OAuth)
  - Requires Capacitor/TWA wrapper for native access
  - Read: steps, weight, heart rate. Write: workouts, body measurements
  - **Implement:** `src/wearableIntegration.js`

- [ ] **#37 🟡 Auto-Backup to File System**
  - Weekly auto-export backup JSON via File System Access API
  - Show "last backup" date in settings
  - Zero cost — writes to user's own device
  - **Modify:** `dataStore.js`, settings UI

### Cardio & GPS (All Free)

- [ ] **#22 🟠 Cardio Distance & Pace Tracking**
  - Build cardio logging UI: distance (km/mi), time, pace
  - `KEYS.cardios` schema already exists, just needs UI
  - Cardio analytics: pace trends, weekly distance, best efforts
  - **Modify:** workout form, `KEYS.cardios`, analytics charts

- [ ] **#23 🟡 GPS Route Tracking**
  - **API:** Geolocation API (free, browser-native) + Leaflet.js + OpenStreetMap tiles (free)
  - `watchPosition()` for live run/ride/walk tracking
  - Store polyline, show route on map with pace/distance/elevation
  - **New file:** `src/gpsTracker.js`

- [ ] **#24 🟢 Strava / Garmin CSV Import**
  - Parse Strava/Garmin export CSV format
  - Auto-map columns, import as cardio entries
  - **Modify:** `exportView.js`

---

## Phase 5 — Polish & Delight

> Final touches that make casual users stay and power users obsess.

### Experience-Level Features

- [ ] **#51 🟠 Experience-Adaptive UI Complexity** *(NEW)*
  - Based on onboarding level selection:
    - **Beginner:** Hide RPE fields, target weights, advanced toggles, assisted bodyweight checkbox, gym profiles. Show tooltips explaining sets/reps/weight. Default rest timer presets to 60s/90s.
    - **Intermediate:** Show all standard fields. Hide advanced targets by default (current behavior). Add "What is RPE?" helper tooltip.
    - **Advanced:** Show everything. Add quick-toggle for all advanced fields.
    - **Competitor:** Everything + comp prep tools (see #54, #55, #56)
  - User can override anytime in Settings
  - **Modify:** `settingsView.js`, all form rendering in `logView.js`

- [ ] **#52 🟠 Exercise Guide & Form Tips** *(NEW)*
  - When selecting an exercise from database (#6), show:
    - Target muscles (with simple body diagram from Wger API)
    - 1-2 line form cues (e.g., "Keep chest up, drive through heels")
    - Common mistakes
  - Collapsible — don't force it on experienced users
  - **Beginner value:** Massive — replaces needing a personal trainer for basic form
  - **Pro value:** Quick reference for unfamiliar isolation exercises
  - **Data source:** Wger API exercise descriptions (free) + bundled tips JSON
  - **New file:** `src/exerciseGuide.js`

- [ ] **#53 🟠 Suggested Beginner Programs** *(NEW)*
  - Ship 3-4 bundled starter protocols:
    - **Starting Strength** style (3×5, 3 days/week, compound focus)
    - **Push/Pull/Legs** (6 days, intermediate)
    - **Upper/Lower** (4 days, intermediate)
    - **Full Body 3x** (3 days, beginner)
  - Show as "Recommended Programs" in Protocols tab for users with no protocols
  - **Modify:** `protocolsView.js`, bundled data in `exerciseDatabase.js`

### Competition Prep Tools (Advanced/Pro)

- [ ] **#54 🟡 Multiple Macro Profiles (Training / Rest / Carb-Up / Peak Week)** *(NEW)*
  - Support named macro profiles: "Training Day", "Rest Day", "Carb Load", "Depletion"
  - Switch active profile from Today tab or Settings
  - Each profile has its own calorie/protein/carbs/fat goals
  - Today tab rings adjust to active profile
  - **Beginner:** Hidden entirely unless experience level is Advanced/Competitor
  - **Key:** `ft_macro_profiles`
  - **Modify:** `dataStore.js`, `settingsView.js`, `todayView.js`

- [ ] **#55 🟡 Water & Sodium Loading/Cutting Tracker** *(NEW)*
  - Extended water tracker with:
    - Daily sodium intake field (mg)
    - Multi-day water loading protocol view (e.g., 8L → 8L → 4L → 2L → sip)
    - Visual timeline for peak week water/sodium manipulation
  - **Only visible** at Competitor experience level
  - **Modify:** water section in `todayView.js`, `dataStore.js`

- [ ] **#56 🟡 Competition Countdown & Prep Timeline** *(NEW)*
  - Set show date, weeks out auto-calculated
  - Timeline view: current phase (off-season / prep / peak week / show day)
  - Milestone markers: posing practice starts, tan appointment, registration deadline
  - **Only visible** at Competitor experience level
  - **New file:** `src/compPrep.js`
  - **Modify:** Today tab for competitors

### Reports & Analytics

- [ ] **#16 🟡 Weekly & Monthly Report Card**
  - Comprehensive summary: calories, macros, workouts, weight trend, PRs, streaks, readiness avg
  - "Save as Image" via canvas-to-PNG — shareable, no server
  - **Modify:** `analyticsView.js`

- [ ] **#17 🟢 Custom Date Range Analytics**
  - Date range picker: 7d / 14d / 30d / 90d / all / custom
  - Currently hard-coded to "last 14 days"
  - **Modify:** `analyticsView.js`

### Habit & Gamification

- [ ] **#20 🟡 Challenges with Deadlines**
  - Time-bound goals: "Log 20 workouts in April", "Hit protein goal 25/30 days"
  - Progress tracking with countdown
  - **New key:** `ft_challenges`

- [ ] **#21 🟢 Activity Feed (Local Timeline)**
  - Single scrollable timeline of all activity types
  - Rich cards, chronological order
  - **New view or sub-tab**

- [ ] **#31 🟡 Weekly Planning View**
  - Calendar week view, assign protocols to days
  - `KEYS.dayPlans` already exists, unused
  - Planned vs. actual completion
  - **New file:** `src/views/plannerView.js`

- [ ] **#32 🟡 Push Notifications & Reminders**
  - Local notifications (Notification API, free, no server)
  - "Time to log lunch", "Workout scheduled today", "Drink water"
  - Configurable in settings
  - **Modify:** `sw.js`, settings UI

- [ ] **#33 🟢 Gamification — XP & Levels**
  - XP awards: food log=10, workout=50, streak day=20, PR=100
  - Level up at thresholds, badge in header
  - **New file:** `src/gamification.js`

### UX Polish

- [ ] **#41 🟡 Drag-and-Drop Exercise Reordering**
  - Drag handles on exercise rows, touch-sortable
  - **Modify:** `logView.js`

- [ ] **#42 🟡 Haptic Feedback**
  - `navigator.vibrate()`: timer done, food logged, PR, ring complete
  - **Modify:** `showToast()`, `startTimer()`, `triggerCelebration()`

- [ ] **#43 🟡 Accessibility Audit (ARIA & Keyboard)**
  - `role="feed"`, `aria-live`, `role="img"` on charts
  - Keyboard navigation, focus outlines, screen reader support
  - **Modify:** `index.html`, `ui.js`, all views

- [ ] **#44 🟡 Theme Customization (Accent Color Picker)**
  - 6-8 preset accent colors, apply via CSS custom property
  - **Modify:** settings UI, `brand-assets.css`

- [ ] **#45 🟢 Undo Everywhere**
  - Consistent undo for all destructive actions
  - 5-second undo window with snackbar
  - **Extend:** `showUndoToast()` pattern

### Platform Polish

- [ ] **#38 🟢 Webhook Integration (Optional)**
  - Fire webhooks on key events if user configures a URL
  - Compatible with IFTTT, Zapier, or self-hosted automation
  - Zero cost — outbound HTTP only
  - **New file:** `src/webhookService.js`

- [ ] **#50 🟢 PWA Install Prompt & Update Notification**
  - `beforeinstallprompt` → styled install banner
  - SW update → "New version available" banner
  - **Modify:** `main.js`, `index.html`

---

## Existing Stubs Ready to Implement

| Stub | Location | Status | Unlocks |
|------|----------|--------|---------|
| `KEYS.cardios` | `dataStore.js` | Schema exists, zero UI | #22, #23 |
| `KEYS.photos` | `dataStore.js` | Schema exists, zero UI | #13 |
| `KEYS.dayPlans` | `dataStore.js` | Schema exists, zero UI | #31 |
| `KEYS.foodItems` | `dataStore.js` | Schema exists, zero UI | #2, #5 |
| `syncService.js` | `src/` | All no-ops | #35 |
| `wearableIntegration.js` | `src/` | All stubs | #34 |
| `settings.socialEnabled` | `dataStore.js` | Flag only | #18 |
| `settings.aiModulesEnabled` | `dataStore.js` | Flag only | #28 |

---

## Experience Level Feature Matrix

| Feature | Beginner | Intermediate | Advanced | Competitor |
|---------|:--------:|:------------:|:--------:|:----------:|
| Food logging + barcode | ✅ | ✅ | ✅ | ✅ |
| Basic workout logging | ✅ | ✅ | ✅ | ✅ |
| RPE fields | Hidden | Optional | Shown | Shown |
| Target weight/reps | Hidden | Optional | Shown | Shown |
| Exercise form tips | Shown | Collapsed | Collapsed | Collapsed |
| Suggested programs | Prominent | Available | Available | Available |
| 1RM estimation | Info tooltip | Shown | Shown | Shown |
| Volume per muscle group | Simplified | Full | Full + MEV/MRV | Full + periodization |
| Progressive overload | Linear only | Double prog | All schemes | All + RPE-based |
| Multiple macro profiles | Hidden | Hidden | Optional | Shown |
| Water/sodium manipulation | Hidden | Hidden | Hidden | Shown |
| Comp prep timeline | Hidden | Hidden | Hidden | Shown |
| PR tracking | All types | All types | All types | + by weight class |
| Periodized planning | Hidden | Basic | Block periodization | Full mesocycle |

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Total changes | 56 (50 original + 6 new experience-level features) |
| 🔴 P0 Critical | 5 |
| 🟠 P1 High | 19 |
| 🟡 P2 Medium | 24 |
| 🟢 P3 Nice-to-have | 8 |
| New files needed | ~18 |
| External API cost | **$0** |
| Hosting cost | **$0** |
| Paid dependencies | **None** |
