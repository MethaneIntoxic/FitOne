import { expect, test, type Page } from "@playwright/test";
import { scenarios, type UatScenario } from "./uatScenarios";

type OnboardingOptions = { mode: "beginner" | "power"; localOnly?: boolean };

async function clickMainTab(page: Page, tab: "today" | "log" | "analytics" | "protocols" | "data" | "settings") {
  await page.locator(`.tab-btn[data-tab="${tab}"]`).click();
  await expect(page.locator(`#panel-${tab}`)).toHaveClass(/active/);
}

async function clickLogSubTab(page: Page, subtab: "log-food" | "log-workout" | "log-body") {
  await page.locator(`#panel-log .sub-tab[data-subtab="${subtab}"]`).click();
  await expect(page.locator(`#${subtab}`)).toHaveClass(/active/);
}

async function clickAnalyticsSubTab(
  page: Page,
  subtab:
    | "analytics-calories"
    | "analytics-weight"
    | "analytics-workouts"
    | "analytics-timing"
    | "analytics-tdee",
) {
  await page.locator(`#panel-analytics .sub-tab[data-subtab="${subtab}"]`).click();
  await expect(page.locator(`#${subtab}`)).toHaveClass(/active/);
}

async function runOnboarding(page: Page, { mode, localOnly }: OnboardingOptions) {
  await clickMainTab(page, "settings");
  await expect(page.locator("#settingsDataPrivacyCard")).toContainText("Data & Privacy");
  await expect(page.locator("#bodyGoalSelector .goal-option")).toHaveCount(3);

  if (typeof localOnly === "boolean") {
    const localOnlyToggle = page.locator("#settingLocalOnlyMode");
    await localOnlyToggle.setChecked(localOnly);
    await expect(localOnlyToggle).toBeChecked({ checked: localOnly });
  }

  await page.evaluate((chosenMode) => {
    localStorage.setItem("fitone_uat_mode", chosenMode);
  }, mode);

  await page.reload();
  await clickMainTab(page, "settings");
  const storedMode = await page.evaluate(() => localStorage.getItem("fitone_uat_mode"));
  expect(storedMode).toBe(mode);
}

async function installPwaIfNeeded(page: Page) {
  const manifest = page.locator('link[rel="manifest"]');
  await expect(manifest).toHaveAttribute("href", /manifest\.webmanifest/);
  const hasServiceWorkerApi = await page.evaluate(() => "serviceWorker" in navigator);
  expect(hasServiceWorkerApi).toBeTruthy();
}

async function logFoodEntry(
  page: Page,
  entry: {
    name: string;
    meal: "breakfast" | "lunch" | "dinner" | "snack";
    protein: number;
    carbs: number;
    fat: number;
    serving: string;
    validateAutoCalories?: boolean;
  },
) {
  await page.fill("#foodName", entry.name);
  await page.selectOption("#foodMeal", entry.meal);
  await page.fill("#foodProtein", String(entry.protein));
  await page.fill("#foodCarbs", String(entry.carbs));
  await page.fill("#foodFat", String(entry.fat));
  await page.fill("#foodServing", entry.serving);

  if (entry.validateAutoCalories) {
    const expectedCalories = entry.protein * 4 + entry.carbs * 4 + entry.fat * 9;
    await expect(page.locator("#foodCalories")).toHaveValue(String(expectedCalories));
    await expect(page.locator("#autoCalcHint")).toContainText(String(expectedCalories));
  }

  await page.locator("#foodSubmitBtn").click();
}

async function logSampleDayOfFood(page: Page, options?: { includeEdit?: boolean; expectedCount?: number }) {
  await clickMainTab(page, "log");
  await clickLogSubTab(page, "log-food");

  await logFoodEntry(page, {
    name: "Greek Yogurt Bowl",
    meal: "breakfast",
    protein: 24,
    carbs: 30,
    fat: 8,
    serving: "220g",
  });
  await logFoodEntry(page, {
    name: "Chicken Rice Plate",
    meal: "lunch",
    protein: 45,
    carbs: 55,
    fat: 12,
    serving: "1 plate",
  });
  await logFoodEntry(page, {
    name: "Custom Lentil Dinner",
    meal: "dinner",
    protein: 28,
    carbs: 42,
    fat: 10,
    serving: "340g",
  });

  if (options?.includeEdit) {
    await page.locator('[data-edit-food]').first().click();
    await page.fill("#foodServing", "400g (edited)");
    await page.locator("#foodSubmitBtn").click();
  }

  await expect(page.locator("#recentFood .list-item")).toHaveCount(options?.expectedCount ?? 3);
  await expect(page.locator("#recentFood")).toContainText("Custom Lentil Dinner");
}

async function addExerciseRow(page: Page, index: number, exercise: { name: string; sets: number; reps: number; weight: number }) {
  await page.locator('[data-action="addExerciseRow"]').click();
  await page.fill(`#exname_${index}`, exercise.name);
  await page.fill(`#exsets_${index}`, String(exercise.sets));
  await page.fill(`#exreps_${index}`, String(exercise.reps));
  await page.fill(`#exwt_${index}`, String(exercise.weight));
}

async function logStandardWorkout(
  page: Page,
  options?: {
    workoutName?: string;
    type?: "strength" | "cardio" | "flexibility" | "sport" | "other";
    assisted?: boolean;
  },
) {
  await clickMainTab(page, "log");
  await clickLogSubTab(page, "log-workout");

  const workoutName = options?.workoutName ?? "UAT Standard Strength Session";
  await page.fill("#workoutName", workoutName);
  await page.selectOption("#workoutType", options?.type ?? "strength");
  await page.fill("#workoutDuration", "55");
  await page.fill("#workoutCalories", "420");

  await addExerciseRow(page, 1, { name: "Pull Ups", sets: 4, reps: 6, weight: 15 });
  await addExerciseRow(page, 2, { name: "Bench Press", sets: 5, reps: 5, weight: 85 });

  if (options?.assisted) {
    await page.locator("#exrow_1 [data-action=\"toggle-ex-advanced\"]").click();
    await page.locator("#exassist_1").setChecked(true);
    await expect(page.locator("#exassist_1")).toBeChecked();
    await page.fill("#exwt_1", "20");
  }

  await page.locator('[data-action="logWorkout"]').click();

  const cooldownDone = page.locator("#cooldownDoneBtn");
  if (await cooldownDone.isVisible()) {
    await cooldownDone.click();
  }

  await expect(page.locator("#recentWorkouts")).toContainText(workoutName);
}

async function logBasicBodyMeasurement(page: Page) {
  await clickMainTab(page, "log");
  await clickLogSubTab(page, "log-body");

  await page.fill("#bodyWeight", "72.4");
  await page.fill("#bodyFat", "19.1");
  await page.fill("#bodyWaist", "80");
  await page.fill("#bodyChest", "94");
  await page.fill("#bodyArms", "31");
  await page.fill("#bodyLegs", "54");
  await page.fill("#bodyNotes", "UAT baseline measurement");
  await page.locator('[data-action="logBody"]').click();

  await expect(page.locator("#bodyHistory")).toContainText("72.4");
}

async function openAnalyticsAndCheckBasicTrends(page: Page) {
  await clickMainTab(page, "analytics");
  await expect(page.locator("#analytics-calories")).toContainText("Calorie Trend (Last 14 Days)");
  await expect(page.locator("#weeklySummaryCard")).toContainText("Weekly Summary");

  await clickAnalyticsSubTab(page, "analytics-workouts");
  await expect(page.locator("#workoutStatsCard")).toContainText("Workout Stats");

  await clickAnalyticsSubTab(page, "analytics-weight");
  await expect(page.locator("#analytics-weight canvas#chartWeight")).toBeVisible();
}

async function checkPrivacyDashboard(page: Page) {
  await clickMainTab(page, "settings");
  await expect(page.locator("#settingsDataPrivacyCard")).toContainText("Local-only mode");
  await expect(page.locator("#settingsDataPrivacyCard")).toContainText("All data is stored on this device only");
}

async function addWaterAndCheck(page: Page) {
  await clickMainTab(page, "today");
  await page.locator('[data-action="addWater"][data-amount="250"]').click();
  await page.locator('[data-action="addWater"][data-amount="500"]').click();
  await page.fill("#customWater", "300");
  await page.locator('[data-action="addCustomWater"]').click();
  await page.locator('[data-action="undoWater"]').click();
  await expect(page.locator("#waterInfo")).toContainText("750");
}

async function exportGlobalJsonAndCsv(page: Page) {
  await clickMainTab(page, "data");
  const jsonDownloadPromise = page.waitForEvent("download");
  await page.locator("#exportGlobalJsonBtn").click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toContain(".json");

  const csvDownloadPromise = page.waitForEvent("download");
  await page.locator("#exportGlobalCsvBtn").click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toContain(".csv");
}

async function importJsonPayload(page: Page) {
  await clickMainTab(page, "data");
  await page.selectOption("#dataImportType", "food_logs");

  const payload = [
    {
      id: "uat-import-food-1",
      timestamp: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      meal: "breakfast",
      food_name: "Imported Oats",
      serving: "80g",
      calories: 300,
      protein: 12,
      carbs: 50,
      fat: 6,
    },
  ];

  await page.setInputFiles("#importFile", {
    name: "food_logs.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload, null, 2)),
  });

  await expect(page.locator("#commitImportBtn")).toBeVisible();
  await page.locator("#commitImportBtn").click();
  await expect(page.locator("#importSummary")).toContainText("Imported");
}

async function importCsvPayload(page: Page) {
  await clickMainTab(page, "data");
  await page.selectOption("#dataImportType", "workouts");

  const today = new Date().toISOString().slice(0, 10);
  const csv = [
    "id,timestamp,date,name,type,duration_min,calories_burned,protocol_id,notes",
    `uat-w-1,${Date.now()},${today},Imported Workout,strength,45,350,,CSV import`,
  ].join("\n");

  await page.setInputFiles("#importFile", {
    name: "workouts.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });

  await expect(page.locator("#commitImportBtn")).toBeVisible();
  await page.locator("#commitImportBtn").click();
  await expect(page.locator("#importSummary")).toContainText("Imported");
}

async function checkOfflineWorkoutFlow(page: Page) {
  await page.context().setOffline(true);
  await logStandardWorkout(page, { workoutName: "Offline Session", type: "strength" });
  await page.context().setOffline(false);
  await expect(page.locator("#recentWorkouts")).toContainText("Offline Session");
}

function assertScenarioDefinitionQuality(scenario: UatScenario) {
  expect(scenario.preconditions.length).toBeGreaterThanOrEqual(2);
  expect(scenario.detailedSteps.length).toBeGreaterThanOrEqual(4);
  expect(scenario.expectedOutcomes.length).toBeGreaterThanOrEqual(2);
  expect(scenario.failureSignals.length).toBeGreaterThanOrEqual(2);
}

async function runScenario(page: Page, scenario: UatScenario) {
  assertScenarioDefinitionQuality(scenario);

  switch (scenario.id) {
    case "UAT-001":
      await installPwaIfNeeded(page);
      await runOnboarding(page, { mode: "beginner", localOnly: true });
      await clickMainTab(page, "today");
      await expect(page.locator("#panel-today")).toContainText("Today's Food");
      return;
    case "UAT-002":
      await runOnboarding(page, { mode: "beginner", localOnly: true });
      await checkPrivacyDashboard(page);
      return;
    case "UAT-003":
      await runOnboarding(page, { mode: "beginner", localOnly: true });
      await logBasicBodyMeasurement(page);
      return;
    case "UAT-004":
      await addWaterAndCheck(page);
      return;
    case "UAT-005":
      await runOnboarding(page, { mode: "beginner" });
      await clickMainTab(page, "log");
      await clickLogSubTab(page, "log-food");
      await logFoodEntry(page, {
        name: "Macro Test Meal",
        meal: "breakfast",
        protein: 25,
        carbs: 40,
        fat: 10,
        serving: "1 bowl",
        validateAutoCalories: true,
      });
      await logSampleDayOfFood(page, { includeEdit: false, expectedCount: 4 });
      await expect(page.locator("#recentFood")).toContainText("Macro Test Meal");
      return;
    case "UAT-006":
      await runOnboarding(page, { mode: "beginner" });
      await logSampleDayOfFood(page, { includeEdit: true });
      await expect(page.locator("#recentFood")).toContainText("edited");
      return;
    case "UAT-007":
      await clickMainTab(page, "settings");
      await page.fill("#newGymName", "Downtown Iron Club");
      await page.locator("#addGymBtn").click();
      await expect(page.locator("#gymList")).toContainText("Downtown Iron Club");
      await logStandardWorkout(page, { workoutName: "Gym PR Baseline", type: "strength" });
      await clickMainTab(page, "analytics");
      await clickAnalyticsSubTab(page, "analytics-workouts");
      await expect(page.locator("#workoutStatsCard")).toContainText("Workout Stats");
      return;
    case "UAT-008":
      await clickMainTab(page, "protocols");
      await expect(page.locator("#panel-protocols")).toContainText("Workout Protocols");
      await logStandardWorkout(page, { workoutName: "Routine Change Session", type: "strength" });
      return;
    case "UAT-009":
      await logStandardWorkout(page, { workoutName: "Quick Shift Session", type: "strength" });
      await clickMainTab(page, "today");
      await expect(page.locator("#todayWorkouts")).toContainText("Quick Shift Session");
      return;
    case "UAT-010":
      await logSampleDayOfFood(page, { includeEdit: false });
      await logStandardWorkout(page, { workoutName: "Recomp Lift", type: "strength" });
      await logBasicBodyMeasurement(page);
      await openAnalyticsAndCheckBasicTrends(page);
      return;
    case "UAT-011":
      await logSampleDayOfFood(page, { includeEdit: false });
      await exportGlobalJsonAndCsv(page);
      await importJsonPayload(page);
      await clickMainTab(page, "log");
      await clickLogSubTab(page, "log-food");
      await expect(page.locator("#recentFood")).toContainText("Imported Oats");
      return;
    case "UAT-012":
      await exportGlobalJsonAndCsv(page);
      await importCsvPayload(page);
      await clickMainTab(page, "log");
      await clickLogSubTab(page, "log-workout");
      await expect(page.locator("#recentWorkouts")).toContainText("Imported Workout");
      return;
    case "UAT-013":
      await checkOfflineWorkoutFlow(page);
      return;
    case "UAT-014":
      await logStandardWorkout(page, {
        workoutName: "Assisted Pull Progression",
        type: "strength",
        assisted: true,
      });
      await clickMainTab(page, "analytics");
      await clickAnalyticsSubTab(page, "analytics-workouts");
      await expect(page.locator("#workoutStatsCard")).toContainText("Best Effective Load");
      return;
    case "UAT-015": {
      const start = Date.now();
      await expect(page.locator("#panel-today")).toContainText("Daily Calories");
      await clickMainTab(page, "log");
      await clickMainTab(page, "analytics");
      await clickMainTab(page, "settings");
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
      return;
    }
    default:
      throw new Error(`Scenario handler not implemented for ${scenario.id}`);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await expect(page.locator("#app")).toBeVisible();
});

for (const scenario of scenarios) {
  test.describe(`${scenario.id} – ${scenario.title}`, () => {
    test(scenario.id, async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#app")).toBeVisible();
      await runScenario(page, scenario);
    });
  });
}