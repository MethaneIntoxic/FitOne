export interface UatScenario {
  id: string;
  title: string;
  persona: string;
  category: string;
  mode: "beginner" | "power";
  tags: string[];
  stepsSummary: string;
  expectedSummary: string;
  preconditions: string[];
  detailedSteps: string[];
  expectedOutcomes: string[];
  failureSignals: string[];
}

export const scenarios: UatScenario[] = [
  {
    id: "UAT-001",
    title: "Install & first-run (Beginner, Android PWA)",
    persona: "Amira – new to tracking",
    category: "Onboarding",
    mode: "beginner",
    tags: ["android", "pwa", "onboarding"],
    stepsSummary:
      "Install FitOne as a PWA on Android, run onboarding in Beginner mode, set basic goals.",
    expectedSummary:
      "PWA installs & launches standalone; onboarding uses simple language and leads clearly to today's log.",
    preconditions: [
      "App is served at the configured base URL and initial page loads cleanly.",
      "Browser supports service workers and manifest inspection.",
      "No persisted onboarding state exists for the current test context.",
    ],
    detailedSteps: [
      "Open app root and verify app shell is rendered.",
      "Validate manifest link and service-worker capability in browser context.",
      "Navigate to Settings and enforce Beginner mode onboarding state.",
      "Persist onboarding mode and reload app.",
      "Return to Today tab and verify primary logging entry points are visible.",
    ],
    expectedOutcomes: [
      "Manifest reference remains valid and discoverable.",
      "Beginner mode state is persisted across reload.",
      "Today tab remains usable after initial setup flow.",
    ],
    failureSignals: [
      "Missing manifest or service worker capability.",
      "Onboarding mode not persisted.",
      "Today panel fails to render key cards.",
    ],
  },
  {
    id: "UAT-002",
    title: "Privacy-first setup (Local-only strict mode)",
    persona: "Noah – privacy focused",
    category: "Privacy",
    mode: "beginner",
    tags: ["privacy", "local-only", "settings"],
    stepsSummary:
      "Open Settings, verify Data & Privacy details, keep Local-only + strict mode enabled.",
    expectedSummary:
      "Privacy copy clearly states on-device storage and local-only mode remains enabled.",
    preconditions: [
      "Settings tab is accessible.",
      "Privacy card and associated toggles are rendered dynamically.",
    ],
    detailedSteps: [
      "Navigate to Settings panel.",
      "Enable Local-only mode and Strict mode explicitly.",
      "Verify both toggles remain checked after settings update.",
      "Verify privacy copy includes on-device/local-only language.",
    ],
    expectedOutcomes: [
      "Local-only and strict flags persist in UI state.",
      "Privacy card communicates storage boundaries clearly.",
    ],
    failureSignals: [
      "Toggles de-select unexpectedly.",
      "Privacy text omits local-only guarantees.",
    ],
  },
  {
    id: "UAT-003",
    title: "First body check-in and goal alignment",
    persona: "Amira – new to tracking",
    category: "Onboarding",
    mode: "beginner",
    tags: ["body", "goals", "setup"],
    stepsSummary:
      "Set body goal and log first body measurement with notes.",
    expectedSummary:
      "Body history records the entry and reflects selected units/goals cleanly.",
    preconditions: [
      "Log panel body sub-tab is available.",
      "Body form accepts numeric measurements.",
    ],
    detailedSteps: [
      "Navigate to Settings and select a body goal target.",
      "Open Log > Body sub-tab.",
      "Enter weight/body-fat/circumference measurements and notes.",
      "Submit body entry.",
      "Validate newly created record in body history section.",
    ],
    expectedOutcomes: [
      "Body entry is persisted with entered values.",
      "History list reflects new measurement immediately.",
    ],
    failureSignals: [
      "Validation prevents valid measurement save.",
      "History omits newly created record.",
    ],
  },
  {
    id: "UAT-004",
    title: "Hydration quick-add + custom ml",
    persona: "Leo – office professional",
    category: "Daily Tracking",
    mode: "beginner",
    tags: ["hydration", "today", "quick-actions"],
    stepsSummary:
      "Add water via quick buttons and custom amount, then undo one action.",
    expectedSummary:
      "Water total and percentage update immediately and undo works correctly.",
    preconditions: [
      "Today tab hydration card is present.",
      "Quick-add and custom-water controls are enabled.",
    ],
    detailedSteps: [
      "Open Today panel and confirm initial water state.",
      "Apply +250ml and +500ml quick actions.",
      "Add custom water value and submit.",
      "Use Undo on last hydration action.",
      "Verify displayed total and percentage are coherent.",
    ],
    expectedOutcomes: [
      "Hydration values update after each action.",
      "Undo reverses the most recent hydration mutation.",
    ],
    failureSignals: [
      "Hydration total not updated deterministically.",
      "Undo does not revert the latest change.",
    ],
  },
  {
    id: "UAT-005",
    title: "Beginner meal logging with macro auto-calc",
    persona: "Amira – new to tracking",
    category: "Nutrition",
    mode: "beginner",
    tags: ["nutrition", "macros", "beginner"],
    stepsSummary:
      "Log meals with protein/carbs/fat and rely on calorie auto-calc guidance.",
    expectedSummary:
      "Macro-derived calories are applied and recent food list is accurate.",
    preconditions: [
      "Log > Food form is available.",
      "Macro fields are writable and calories field supports auto-calc.",
    ],
    detailedSteps: [
      "Navigate to Log > Food.",
      "For a meal, enter protein/carbs/fat without manual calories.",
      "Validate calories auto-populate as 4/4/9 macro formula before submit.",
      "Submit meal and repeat for multiple meals.",
      "Verify recent-food list count and names.",
    ],
    expectedOutcomes: [
      "Auto-calculated calories match macro formula.",
      "No data loss or duplication in recent list.",
    ],
    failureSignals: [
      "Calories stay empty or mismatch expected formula.",
      "Food rows missing after submit.",
    ],
  },
  {
    id: "UAT-006",
    title: "First day of food tracking (Beginner)",
    persona: "Amira – new to tracking",
    category: "Nutrition",
    mode: "beginner",
    tags: ["nutrition", "food-log"],
    stepsSummary:
      "Log breakfast/lunch/dinner including a custom food and an edited portion.",
    expectedSummary:
      "Per-meal and daily macros update correctly; portion edits are simple; no duplicate/ghost entries.",
    preconditions: [
      "Food edit controls are visible in recent list.",
      "Food form supports serving-size edits.",
    ],
    detailedSteps: [
      "Log three meals across breakfast/lunch/dinner.",
      "Open edit action on one existing row.",
      "Change serving-size text and save update.",
      "Verify edited value appears once and only once.",
      "Validate recent list still has expected row count.",
    ],
    expectedOutcomes: [
      "Edited row persists updated serving-size text.",
      "No duplicate/ghost rows after edit-save cycle.",
    ],
    failureSignals: [
      "Edit creates duplicate entries.",
      "Edited value not retained.",
    ],
  },
  {
    id: "UAT-007",
    title: "Per-gym PR tracking baseline",
    persona: "Kay – powerlifter",
    category: "Strength",
    mode: "power",
    tags: ["strength", "pr", "gym-profiles"],
    stepsSummary:
      "Create gym profile and log a heavy session with exercise sets.",
    expectedSummary:
      "Workout and sets are stored; workout analytics and summaries render without missing values.",
    preconditions: [
      "Settings gym-profile controls are enabled.",
      "Workout logging form can add multiple exercise rows.",
    ],
    detailedSteps: [
      "Create a named gym profile in Settings.",
      "Log a strength workout with multiple exercises/sets.",
      "Save workout and inspect recent workout list.",
      "Open analytics workout sub-tab for summary metrics.",
    ],
    expectedOutcomes: [
      "Gym profile is persisted and visible.",
      "Workout appears in recent list with expected metadata.",
      "Workout summary widgets render without NaN/blank values.",
    ],
    failureSignals: [
      "Gym profile not retained.",
      "Workout save does not reflect in recent/analytics.",
    ],
  },
  {
    id: "UAT-008",
    title: "Routine versioning after workout changes",
    persona: "Kay – powerlifter",
    category: "Strength",
    mode: "power",
    tags: ["routine", "versioning", "protocols"],
    stepsSummary:
      "Log workout from protocol, modify exercise details, and choose variant/update flow.",
    expectedSummary:
      "Routine-change modal appears and accepts user decision without data corruption.",
    preconditions: [
      "Protocols panel is reachable.",
      "Workout save may trigger routine-change branch when differences are detected.",
    ],
    detailedSteps: [
      "Open Protocols tab and verify protocol workspace availability.",
      "Log workout with explicit exercise changes against baseline.",
      "If routine-change modal appears, validate dismissal/decision controls.",
      "Ensure app remains interactive post-workflow.",
    ],
    expectedOutcomes: [
      "Protocol workflow does not deadlock UI.",
      "State remains consistent after routine decision flow.",
    ],
    failureSignals: [
      "Modal blocks navigation indefinitely.",
      "Post-save state mismatch between panels.",
    ],
  },
  {
    id: "UAT-009",
    title: "Time-flexible session logging",
    persona: "Ravi – shift worker",
    category: "Strength",
    mode: "power",
    tags: ["workout", "flex-time", "logging"],
    stepsSummary:
      "Log a short session quickly from Log tab and verify it appears in Today + Recent.",
    expectedSummary:
      "Session persists with duration/type and updates workout cards immediately.",
    preconditions: [
      "Workout fast-path controls are available.",
      "Today workout summary card is visible.",
    ],
    detailedSteps: [
      "Log a short workout session using minimal required fields.",
      "Validate workout appears in recent list.",
      "Navigate to Today and validate workout card includes new session.",
      "Switch back to Log and confirm session metadata remains unchanged.",
    ],
    expectedOutcomes: [
      "Session persists with entered duration and type.",
      "Today panel reflects newly logged session quickly.",
    ],
    failureSignals: [
      "Recent workout entry missing.",
      "Today workout card not refreshed.",
    ],
  },
  {
    id: "UAT-010",
    title: "Recomposition trend visibility",
    persona: "Mina – body recomposition",
    category: "Analytics",
    mode: "power",
    tags: ["analytics", "weight", "recomposition"],
    stepsSummary:
      "Log food, workouts, and body entries then inspect calorie, workout, and weight analytics views.",
    expectedSummary:
      "Charts and weekly summary cards render with coherent trend context.",
    preconditions: [
      "Analytics tab and all sub-tabs are navigable.",
      "At least one food/workout/body entry can be created in-session.",
    ],
    detailedSteps: [
      "Create representative nutrition, training, and body measurements.",
      "Open analytics calories sub-tab and verify summary card.",
      "Open workout sub-tab and verify stats card.",
      "Open weight sub-tab and verify chart rendering.",
    ],
    expectedOutcomes: [
      "Charts render without runtime errors.",
      "Summary cards show non-empty trend values.",
    ],
    failureSignals: [
      "Chart canvases absent or blank due to errors.",
      "Summary card missing expected sections.",
    ],
  },
  {
    id: "UAT-011",
    title: "JSON backup and restore",
    persona: "Noah – privacy focused",
    category: "Export",
    mode: "beginner",
    tags: ["backup", "json", "restore"],
    stepsSummary:
      "Export global JSON then import a JSON payload via Data Studio.",
    expectedSummary:
      "Download is generated and importer commits valid rows with a clear summary.",
    preconditions: [
      "Data Studio panel is reachable.",
      "Browser context supports download events.",
    ],
    detailedSteps: [
      "Open Data tab and trigger global JSON export.",
      "Verify downloaded filename extension.",
      "Inject valid JSON import file through hidden input.",
      "Commit import and validate import summary output.",
    ],
    expectedOutcomes: [
      "JSON file is downloadable.",
      "Import mapping/commit flow completes successfully.",
    ],
    failureSignals: [
      "Download event not fired.",
      "Import commit action unavailable or fails silently.",
    ],
  },
  {
    id: "UAT-012",
    title: "CSV export and import mapping",
    persona: "Ravi – spreadsheet user",
    category: "Export",
    mode: "power",
    tags: ["csv", "import", "mapping"],
    stepsSummary:
      "Export CSV files and import a CSV sample through mapping UI.",
    expectedSummary:
      "At least one CSV download is produced and import commit confirms inserted rows.",
    preconditions: [
      "Data Studio CSV export controls are active.",
      "CSV import parser/mapping UI can be rendered.",
    ],
    detailedSteps: [
      "Trigger CSV export from Data Studio and verify download output.",
      "Upload valid workouts CSV payload.",
      "Review mapping UI visibility.",
      "Commit import and verify summary reports imported rows.",
    ],
    expectedOutcomes: [
      "CSV export action emits downloadable file.",
      "CSV import commit path inserts valid records.",
    ],
    failureSignals: [
      "CSV export does not trigger download.",
      "Mapping/commit controls missing after upload.",
    ],
  },
  {
    id: "UAT-013",
    title: "Offline workout logging and resumption",
    persona: "Kay – trains in low connectivity gym",
    category: "Offline",
    mode: "power",
    tags: ["offline", "workout", "resilience"],
    stepsSummary:
      "Switch browser context offline, log workout, then return online.",
    expectedSummary:
      "Workout logging remains functional offline and data persists after reconnect.",
    preconditions: [
      "Browser context can toggle offline mode.",
      "Workout logging does not require online API for local persistence.",
    ],
    detailedSteps: [
      "Set browser context offline.",
      "Log workout completely while offline.",
      "Re-enable online mode.",
      "Verify workout record still exists in recent list.",
    ],
    expectedOutcomes: [
      "Offline mutation path succeeds.",
      "Data persists after reconnect.",
    ],
    failureSignals: [
      "Offline mode blocks local workout save.",
      "Saved workout disappears after reconnect.",
    ],
  },
  {
    id: "UAT-014",
    title: "Assisted pull-ups with effective load",
    persona: "Kay – powerlifter",
    category: "Strength",
    mode: "power",
    tags: ["strength", "assisted", "effective-load"],
    stepsSummary:
      "Log assisted pull-ups with decreasing assistance; check PR and trend graphs.",
    expectedSummary:
      "Effective load (bodyweight minus assist) increases over time; PRs reflect this; no bogus spikes.",
    preconditions: [
      "Workout form supports assisted flag and advanced fields.",
      "Workout analytics summary exposes effective-load metric.",
    ],
    detailedSteps: [
      "Log assisted pull-up workout using advanced assisted toggle.",
      "Save workout and navigate to workout analytics.",
      "Verify effective-load summary text appears in stats card.",
      "Verify assisted session name remains visible in recent workouts.",
    ],
    expectedOutcomes: [
      "Assisted exercise state is accepted by workout logger.",
      "Analytics renders effective-load metric field.",
    ],
    failureSignals: [
      "Assisted toggle value not persisted in workout flow.",
      "Effective-load summary absent in analytics.",
    ],
  },
  {
    id: "UAT-015",
    title: "Performance baseline on static SPA",
    persona: "QA benchmark runner",
    category: "Performance",
    mode: "beginner",
    tags: ["performance", "spa", "stability"],
    stepsSummary:
      "Open app, switch major tabs, and verify UI becomes interactive quickly.",
    expectedSummary:
      "Critical surfaces render in expected time budget and remain responsive.",
    preconditions: [
      "App initial route is reachable.",
      "Main tabs can be switched without external dependencies.",
    ],
    detailedSteps: [
      "Capture start timestamp after shell render.",
      "Navigate across Log, Analytics, and Settings tabs sequentially.",
      "Measure elapsed interaction time for critical tab traversal.",
      "Assert elapsed time remains under budget threshold.",
    ],
    expectedOutcomes: [
      "Critical navigation path remains responsive.",
      "No blocking script errors during tab traversal.",
    ],
    failureSignals: [
      "Tab transitions exceed performance budget.",
      "Main panel activation fails during traversal.",
    ],
  },
];