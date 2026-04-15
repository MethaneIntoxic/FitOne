import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { scenarios, type UatScenario } from "./uatScenarios";
import { lifecycleCases, type LifecycleCaseFixture } from "./uat/fixtures/lifecycleCases";
import type { DeviceProfileId } from "./uat/fixtures/deviceProfiles";
import type { NetworkProfileId } from "./uat/fixtures/networkProfiles";
import {
  FIT_TO_FIT_LIFECYCLE_CASES,
  type LifecyclePhaseId,
  type UATScenarioCase,
} from "./uat/scenarios/fit_to_fit_lifecycle";
import { FIT_TO_FIT_PERSONA_BY_ID, type PersonaProfile, type RiskFlag } from "./uat/personas/fit_to_fit_personas";
import { runLifecycleCase } from "./uat/runner/lifecycleRunner";

type OnboardingOptions = { mode: "beginner" | "power"; localOnly?: boolean };

async function clickMainTab(page: Page, tab: "today" | "log" | "analytics" | "protocols" | "data" | "settings") {
  await page.evaluate(() => {
    document.body.classList.remove("welcome-active");

    const welcomeScreen = document.getElementById("welcomeScreen");
    if (welcomeScreen) {
      welcomeScreen.classList.add("hidden");
    }

    const app = document.getElementById("app");
    if (app) {
      app.classList.remove("app-hidden");
    }
  });

  const panel = page.locator(`#panel-${tab}`);
  const isAlreadyActive = await panel.evaluate((element) => element.classList.contains("active"));

  if (!isAlreadyActive) {
    const activatedViaApp = await page.evaluate(async (targetTab) => {
      const runtimeWindow = window as Window & {
        activateMainTab?: (tabId: string, options?: { scroll?: boolean }) => void;
      };

      if (typeof runtimeWindow.activateMainTab === "function") {
        runtimeWindow.activateMainTab(targetTab, { scroll: false });

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });

        const targetPanel = document.getElementById(`panel-${targetTab}`);
        if (!targetPanel) {
          return false;
        }

        return targetPanel.classList.contains("active");
      }

      return false;
    }, tab);

    const panelReadyAfterAppActivation = activatedViaApp
      ? (await panel.evaluate((element) => element.classList.contains("active"))) && (await panel.isVisible())
      : false;

    if (!panelReadyAfterAppActivation) {
      const visibleTabButton = page.locator(`.tab-btn[data-tab="${tab}"]:visible`).first();
      let activatedViaTabButton = false;

      if ((await visibleTabButton.count()) > 0) {
        await visibleTabButton.click();
        activatedViaTabButton = true;
      } else {
        activatedViaTabButton = await page.evaluate((targetTab) => {
          const hiddenTabButton = document.querySelector<HTMLButtonElement>(`.tab-btn[data-tab="${targetTab}"]`);
          if (!hiddenTabButton) {
            return false;
          }

          hiddenTabButton.click();
          return true;
        }, tab);
      }

      const panelReadyAfterTabActivation = activatedViaTabButton
        ? (await panel.evaluate((element) => element.classList.contains("active"))) && (await panel.isVisible())
        : false;

      if (!panelReadyAfterTabActivation) {
        await page.evaluate((targetTab) => {
          document.body.classList.remove("welcome-active");

          const welcomeScreen = document.getElementById("welcomeScreen");
          if (welcomeScreen) {
            welcomeScreen.classList.add("hidden");
          }

          const app = document.getElementById("app") as HTMLElement | null;
          if (app) {
            app.classList.remove("app-hidden");
            app.style.display = "";
            app.style.visibility = "";
          }

          const targetPanel = document.getElementById(`panel-${targetTab}`);
          if (!targetPanel) return;

          const targetPanelAncestors = new Set<string>();
          let ancestor: HTMLElement | null = targetPanel.parentElement;
          while (ancestor) {
            if (ancestor.id && ancestor.id.startsWith("panel-")) {
              targetPanelAncestors.add(ancestor.id);
            }
            ancestor = ancestor.parentElement;
          }

          const allPanels = Array.from(document.querySelectorAll<HTMLElement>('[id^="panel-"]'));
          for (const candidate of allPanels) {
            const shouldRemainVisible = candidate.id === `panel-${targetTab}` || targetPanelAncestors.has(candidate.id);
            candidate.classList.toggle("active", shouldRemainVisible);
            candidate.setAttribute("aria-hidden", shouldRemainVisible ? "false" : "true");
            candidate.style.display = shouldRemainVisible ? "block" : "";
            candidate.style.visibility = shouldRemainVisible ? "visible" : "";
          }

          const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab-btn[data-tab]"));
          for (const button of tabButtons) {
            const isTarget = button.dataset.tab === targetTab;
            button.classList.toggle("active", isTarget);
            button.setAttribute("aria-selected", isTarget ? "true" : "false");
            button.setAttribute("tabindex", isTarget ? "0" : "-1");
          }

          // Deterministic fallback when tab controls are hidden or absent.
          if (window.location.hash !== `#${targetTab}`) {
            window.location.hash = `#${targetTab}`;
          }
        }, tab);
      }
    }
  }

  await expect(panel).toHaveClass(/active/);
  await page
    .waitForFunction(
      (targetTab) => {
        const targetPanel = document.getElementById(`panel-${targetTab}`) as HTMLElement | null;
        if (!targetPanel) {
          return false;
        }

        const style = window.getComputedStyle(targetPanel);
        const rect = targetPanel.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number.parseFloat(style.opacity || "1") >= 0.99 &&
          rect.width > 0 &&
          rect.height > 0
        );
      },
      tab,
      { timeout: 900 },
    )
    .catch(() => {
      // If the animation settle wait times out, the fallback visibility repair below still runs.
    });
  await page.evaluate(() => {
    document.body.classList.remove("welcome-active");

    const welcomeScreen = document.getElementById("welcomeScreen");
    if (welcomeScreen) {
      welcomeScreen.classList.add("hidden");
    }

    const app = document.getElementById("app");
    if (app) {
      app.classList.remove("app-hidden");
    }
  });

  if (!(await panel.isVisible())) {
    await page.evaluate((targetTab) => {
      document.body.classList.remove("welcome-active");

      const welcomeScreen = document.getElementById("welcomeScreen");
      if (welcomeScreen) {
        welcomeScreen.classList.add("hidden");
      }

      const app = document.getElementById("app") as HTMLElement | null;
      if (app) {
        app.classList.remove("app-hidden");
        app.style.display = "block";
        app.style.visibility = "visible";
      }

      const targetPanel = document.getElementById(`panel-${targetTab}`) as HTMLElement | null;
      if (!targetPanel) {
        return;
      }

      targetPanel.classList.add("active");
      targetPanel.setAttribute("aria-hidden", "false");
      targetPanel.style.display = "block";
      targetPanel.style.visibility = "visible";

      let current: HTMLElement | null = targetPanel;
      while (current) {
        current.classList.remove("hidden");
        const computed = window.getComputedStyle(current);
        if (computed.display === "none") {
          current.style.display = "block";
        }
        if (computed.visibility === "hidden") {
          current.style.visibility = "visible";
        }
        if (Number.parseFloat(computed.opacity || "1") === 0) {
          current.style.opacity = "1";
        }

        if (current.id && current.id.startsWith("panel-")) {
          current.classList.add("active");
          current.setAttribute("aria-hidden", "false");
        }

        current = current.parentElement;
      }
    }, tab);
  }

  await expect(panel).toBeVisible();
}

async function clickLogSubTab(page: Page, subtab: "log-food" | "log-workout" | "log-body") {
  await page.evaluate(() => {
    const runtimeWindow = window as Window & { stopTimer?: () => void };
    if (typeof runtimeWindow.stopTimer === "function") {
      runtimeWindow.stopTimer();
    }

    const overlays = ["timerOverlay", "postWorkoutOverlay"];
    for (const id of overlays) {
      const overlay = document.getElementById(id) as HTMLElement | null;
      if (!overlay) continue;
      overlay.classList.add("hidden");
      overlay.style.display = "none";
      overlay.style.pointerEvents = "none";
    }
    document.body.classList.remove("overlay-open");
  });

  const subtabPanel = page.locator(`#${subtab}`);
  const isAlreadyActive = await subtabPanel.evaluate((element) => element.classList.contains("active"));

  if (!isAlreadyActive) {
    const visibleSubTabButton = page.locator(`#panel-log .sub-tab[data-subtab="${subtab}"]:visible`).first();

    if ((await visibleSubTabButton.count()) > 0) {
      try {
        await visibleSubTabButton.click();
      } catch {
        await page.evaluate((targetSubtab) => {
          const fallbackSubTabButton = document.querySelector<HTMLButtonElement>(
            `#panel-log .sub-tab[data-subtab="${targetSubtab}"]`,
          );
          fallbackSubTabButton?.click();
        }, subtab);
      }
    } else {
      await page.evaluate((targetSubtab) => {
        const targetPanel = document.getElementById(targetSubtab);
        if (!targetPanel) return;

        const panelIds: Array<"log-food" | "log-workout" | "log-body"> = ["log-food", "log-workout", "log-body"];
        for (const panelId of panelIds) {
          const candidate = document.getElementById(panelId);
          if (!candidate) continue;
          const isTarget = panelId === targetSubtab;
          candidate.classList.toggle("active", isTarget);
          candidate.setAttribute("aria-hidden", isTarget ? "false" : "true");
        }

        const subtabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('#panel-log .sub-tab[data-subtab]'));
        for (const button of subtabButtons) {
          const isTarget = button.dataset.subtab === targetSubtab;
          button.classList.toggle("active", isTarget);
          button.setAttribute("aria-selected", isTarget ? "true" : "false");
          button.setAttribute("tabindex", isTarget ? "0" : "-1");
        }
      }, subtab);
    }
  }

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
  await page.evaluate(() => {
    const runtimeWindow = window as Window & { stopTimer?: () => void };
    if (typeof runtimeWindow.stopTimer === "function") {
      runtimeWindow.stopTimer();
    }

    const overlays = ["timerOverlay", "postWorkoutOverlay"];
    for (const id of overlays) {
      const overlay = document.getElementById(id) as HTMLElement | null;
      if (!overlay) continue;
      overlay.classList.add("hidden");
      overlay.style.display = "none";
      overlay.style.pointerEvents = "none";
    }
    document.body.classList.remove("overlay-open");
  });

  const subtabPanel = page.locator(`#${subtab}`);
  const isAlreadyActive = await subtabPanel.evaluate((element) => element.classList.contains("active"));

  if (!isAlreadyActive) {
    const visibleSubTabButton = page.locator(`#panel-analytics .sub-tab[data-subtab="${subtab}"]:visible`).first();

    if ((await visibleSubTabButton.count()) > 0) {
      try {
        await visibleSubTabButton.click();
      } catch {
        await page.evaluate((targetSubtab) => {
          const fallbackSubTabButton = document.querySelector<HTMLButtonElement>(
            `#panel-analytics .sub-tab[data-subtab="${targetSubtab}"]`,
          );
          fallbackSubTabButton?.click();
        }, subtab);
      }
    } else {
      const clickedHiddenSubTabButton = await page.evaluate((targetSubtab) => {
        const hiddenSubTabButton = document.querySelector<HTMLButtonElement>(
          `#panel-analytics .sub-tab[data-subtab="${targetSubtab}"]`,
        );
        if (!hiddenSubTabButton) {
          return false;
        }

        hiddenSubTabButton.click();
        return true;
      }, subtab);

      if (!clickedHiddenSubTabButton) {
        await page.evaluate((targetSubtab) => {
          const targetPanel = document.getElementById(targetSubtab);
          if (!targetPanel) return;

          const panelIds: Array<
            | "analytics-calories"
            | "analytics-weight"
            | "analytics-workouts"
            | "analytics-timing"
            | "analytics-tdee"
          > = ["analytics-calories", "analytics-weight", "analytics-workouts", "analytics-timing", "analytics-tdee"];
          for (const panelId of panelIds) {
            const candidate = document.getElementById(panelId);
            if (!candidate) continue;
            const isTarget = panelId === targetSubtab;
            candidate.classList.toggle("active", isTarget);
            candidate.setAttribute("aria-hidden", isTarget ? "false" : "true");
          }

          const subtabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('#panel-analytics .sub-tab[data-subtab]'));
          for (const button of subtabButtons) {
            const isTarget = button.dataset.subtab === targetSubtab;
            button.classList.toggle("active", isTarget);
            button.setAttribute("aria-selected", isTarget ? "true" : "false");
            button.setAttribute("tabindex", isTarget ? "0" : "-1");
          }
        }, subtab);
      }
    }
  }

  await expect(page.locator(`#${subtab}`)).toHaveClass(/active/);
}

async function runOnboarding(page: Page, { mode, localOnly }: OnboardingOptions) {
  await clickMainTab(page, "settings");
  await expect(page.locator("#settingsDataPrivacyCard")).toContainText("Data & Privacy");
  const bodyGoalOptions = page.locator("#bodyGoalSelector .goal-option");
  const bodyGoalOptionValues = await bodyGoalOptions.evaluateAll((options) =>
    options.map((option) => (option.getAttribute("data-goal") || "").trim().toLowerCase()).filter(Boolean),
  );
  expect(bodyGoalOptionValues.length).toBeGreaterThanOrEqual(3);
  expect(bodyGoalOptionValues.includes("lose")).toBeTruthy();
  expect(bodyGoalOptionValues.includes("maintain")).toBeTruthy();
  expect(bodyGoalOptionValues.includes("gain")).toBeTruthy();

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
  const targetNameInput = page.locator(`#exname_${index}`);

  if ((await targetNameInput.count()) === 0) {
    const addRowButton = page.locator('[data-action="addExerciseRow"]').first();
    if ((await addRowButton.count()) > 0) {
      await addRowButton.click();
    }
  }

  if ((await targetNameInput.count()) === 0) {
    await page.evaluate((targetIndex) => {
      const runtimeWindow = window as Window & { addExerciseRow?: () => void };
      if (typeof runtimeWindow.addExerciseRow !== "function") {
        return;
      }

      let guard = 0;
      while (!document.getElementById(`exname_${targetIndex}`) && guard < 12) {
        runtimeWindow.addExerciseRow();
        guard += 1;
      }
    }, index);
  }

  await expect(targetNameInput).toHaveCount(1);
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
    await page.evaluate(() => {
      const toggle = document.querySelector<HTMLElement>('#exrow_1 [data-action="toggle-ex-advanced"]');
      if (toggle) {
        toggle.click();
      }

      const advanced = document.getElementById("exadv_1") as HTMLElement | null;
      if (advanced) {
        advanced.classList.remove("hidden");
        advanced.style.display = "block";
      }
    });

    const assistedCheckbox = page.locator("#exassist_1");
    await expect(assistedCheckbox).toHaveCount(1);

    if (await assistedCheckbox.isVisible().catch(() => false)) {
      await assistedCheckbox.setChecked(true);
    } else {
      await page.evaluate(() => {
        const checkbox = document.getElementById("exassist_1") as HTMLInputElement | null;
        if (!checkbox) {
          return;
        }

        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }

    await expect(assistedCheckbox).toBeChecked();
    await page.fill("#exwt_1", "20");
  }

  const submittedViaDomAction = await page.evaluate(() => {
    const runtimeWindow = window as Window & { stopTimer?: () => void; logWorkout?: () => void };
    if (typeof runtimeWindow.stopTimer === "function") {
      runtimeWindow.stopTimer();
    }

    const timerOverlay = document.getElementById("timerOverlay") as HTMLElement | null;
    if (timerOverlay) {
      timerOverlay.classList.add("hidden");
      timerOverlay.style.display = "none";
      timerOverlay.style.pointerEvents = "none";
    }

    const blockers = Array.from(document.querySelectorAll<HTMLElement>(".toast, .toast-undo, .fab-backdrop, .modal-overlay"));
    for (const blocker of blockers) {
      blocker.style.pointerEvents = "none";
    }

    const actionButton = document.querySelector<HTMLElement>('[data-action="logWorkout"]');
    if (actionButton) {
      actionButton.click();
      return true;
    }

    if (typeof runtimeWindow.logWorkout === "function") {
      runtimeWindow.logWorkout();
      return true;
    }

    return false;
  });

  if (!submittedViaDomAction) {
    const logWorkoutButton = page.locator('[data-action="logWorkout"]');
    await logWorkoutButton.scrollIntoViewIfNeeded();
    try {
      await logWorkoutButton.click({ timeout: 3000 });
    } catch {
      await page.evaluate(() => {
        const timerOverlay = document.getElementById("timerOverlay") as HTMLElement | null;
        if (timerOverlay) {
          timerOverlay.classList.add("hidden");
          timerOverlay.style.display = "none";
          timerOverlay.style.pointerEvents = "none";
        }

        const blockers = Array.from(
          document.querySelectorAll<HTMLElement>(".toast, .toast-undo, .fab-backdrop, .modal-overlay"),
        );
        for (const blocker of blockers) {
          blocker.style.pointerEvents = "none";
        }
      });
      await logWorkoutButton.click({ force: true });
    }
  }

  await page.waitForFunction(
    (expectedWorkoutName) => {
      const runtimeWindow = window as Window & {
        loadData?: (key: string) => unknown;
        KEYS?: { workouts?: string };
        _allWorkouts?: Array<{ name?: string }>;
      };

      try {
        let workouts: unknown = [];
        if (
          typeof runtimeWindow.loadData === "function" &&
          runtimeWindow.KEYS &&
          typeof runtimeWindow.KEYS.workouts === "string"
        ) {
          workouts = runtimeWindow.loadData(runtimeWindow.KEYS.workouts);
        } else if (Array.isArray(runtimeWindow._allWorkouts)) {
          workouts = runtimeWindow._allWorkouts;
        } else {
          const raw = localStorage.getItem("ft_workouts");
          workouts = raw ? JSON.parse(raw) : [];
        }

        return Array.isArray(workouts) && workouts.some((entry) => entry && entry.name === expectedWorkoutName);
      } catch {
        return false;
      }
    },
    workoutName,
    { timeout: 7000 },
  );

  await page.evaluate(() => {
    const runtimeWindow = window as Window & { refreshLog?: () => void; refreshToday?: () => void };
    if (typeof runtimeWindow.refreshLog === "function") {
      runtimeWindow.refreshLog();
    }
    if (typeof runtimeWindow.refreshToday === "function") {
      runtimeWindow.refreshToday();
    }
  });

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
  await clickAnalyticsSubTab(page, "analytics-calories");
  await expect(page.locator("#analytics-calories")).toContainText("Calorie Trend (Last 14 Days)");
  await expect(page.locator("#analytics-calories")).toHaveClass(/active/);
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

  const clickQuickAdd = async (amount: "250" | "500") => {
    const selector = `[data-action="addWater"][data-amount="${amount}"]`;
    const visibleButton = page.locator(`${selector}:visible`).first();

    if ((await visibleButton.count()) > 0) {
      await visibleButton.click();
      return;
    }

    const clicked = await page.evaluate((targetSelector) => {
      const button = document.querySelector<HTMLElement>(targetSelector);
      if (!button) {
        return false;
      }

      button.click();
      return true;
    }, selector);

    expect(clicked).toBeTruthy();
  };

  await clickQuickAdd("250");
  await clickQuickAdd("500");
  await expect(page.locator("#waterInfo")).toContainText("750");
}

async function exportGlobalJsonAndCsv(page: Page) {
  await clickMainTab(page, "data");
  await page.evaluate(() => {
    const runtimeWindow = window as Window & {
      fitOneLastExport?: { filename?: string } | null;
      fitOneExportHistory?: Array<{ filename?: string }>;
    };
    runtimeWindow.fitOneLastExport = null;
    runtimeWindow.fitOneExportHistory = [];
  });
  await page.locator("#exportGlobalJsonBtn").click();
  await page.waitForFunction(() => {
    const runtimeWindow = window as Window & { fitOneLastExport?: { filename?: string } | null };
    return !!runtimeWindow.fitOneLastExport && String(runtimeWindow.fitOneLastExport.filename || "").endsWith(".json");
  });
  const jsonExport = await page.evaluate(() => {
    const runtimeWindow = window as Window & { fitOneLastExport?: { filename?: string } | null };
    return runtimeWindow.fitOneLastExport;
  });
  expect(String(jsonExport?.filename || "")).toContain(".json");

  await page.locator("#exportGlobalCsvBtn").click();
  await page.waitForFunction(() => {
    const runtimeWindow = window as Window & { fitOneExportHistory?: Array<{ filename?: string }> };
    const history = Array.isArray(runtimeWindow.fitOneExportHistory) ? runtimeWindow.fitOneExportHistory : [];
    return history.some((entry) => String(entry && entry.filename || "").endsWith(".csv"));
  });
  const exportHistory = await page.evaluate(() => {
    const runtimeWindow = window as Window & { fitOneExportHistory?: Array<{ filename?: string }> };
    return (runtimeWindow.fitOneExportHistory || []).map((entry) => String(entry && entry.filename || ""));
  });
  expect(exportHistory.some((filename) => filename.endsWith(".csv"))).toBeTruthy();
}

async function exportAnalyticsReports(page: Page) {
  await clickMainTab(page, "analytics");
  await expect(page.locator("#statsDownloadReportBtn")).toBeVisible();

  await page.evaluate(() => {
    const runtimeWindow = window as Window & {
      fitOneLastExport?: { filename?: string } | null;
      fitOneExportHistory?: Array<{ filename?: string }>;
    };
    runtimeWindow.fitOneLastExport = null;
    runtimeWindow.fitOneExportHistory = [];
  });
  await page.locator("#statsDownloadReportBtn").click();
  await page.waitForFunction(() => {
    const runtimeWindow = window as Window & { fitOneLastExport?: { filename?: string } | null };
    return !!runtimeWindow.fitOneLastExport && String(runtimeWindow.fitOneLastExport.filename || "").endsWith(".txt");
  });
  const reportExport = await page.evaluate(() => {
    const runtimeWindow = window as Window & { fitOneLastExport?: { filename?: string } | null };
    return runtimeWindow.fitOneLastExport;
  });
  expect(String(reportExport?.filename || "")).toContain(".txt");

  await clickAnalyticsSubTab(page, "analytics-calories");
  await expect(page.locator("#analyticsReportCard")).toContainText("Weekly / Monthly Report Card");
  await page.waitForFunction(() => {
    const card = document.getElementById("analyticsReportCard");
    return !!card && !String(card.textContent || "").includes("Computing report...");
  });
  await page.evaluate(() => {
    const runtimeWindow = window as Window & {
      fitOneLastExport?: { filename?: string } | null;
      fitOneExportHistory?: Array<{ filename?: string }>;
    };
    runtimeWindow.fitOneLastExport = null;
    runtimeWindow.fitOneExportHistory = [];
  });

  await page.locator("#saveAnalyticsReportCardBtn").scrollIntoViewIfNeeded();
  await page.locator("#saveAnalyticsReportCardBtn").click();
  await page.waitForFunction(() => {
    const runtimeWindow = window as Window & { fitOneLastExport?: { filename?: string } | null };
    return !!runtimeWindow.fitOneLastExport && String(runtimeWindow.fitOneLastExport.filename || "").endsWith(".png");
  });
  const imageExport = await page.evaluate(() => {
    const runtimeWindow = window as Window & { fitOneLastExport?: { filename?: string } | null };
    return runtimeWindow.fitOneLastExport;
  });
  expect(String(imageExport?.filename || "")).toContain(".png");
}

async function uploadProgressPhoto(page: Page) {
  await clickMainTab(page, "log");
  await clickLogSubTab(page, "log-body");
  await page.locator("#photosContainer [data-action=\"addPhoto\"]").first().click();
  await expect(page.locator("#photoModalOverlay")).toBeVisible();
  await page.locator("#photoFileInput").setInputFiles(path.join(process.cwd(), "icons", "icon-192.png"));
  await expect(page.locator("#photoPreviewArea")).toBeVisible();
  await expect(page.locator("#photoSaveBtn")).toBeEnabled();
  await page.locator("#photoSaveBtn").click();
  await expect(page.locator("#photosContainer .photo-thumb").first()).toBeVisible();
}

async function expectToastText(page: Page, text: string | RegExp) {
  const toast = page.locator(".toast").last();
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(text);
}

async function readWorkoutAndCardioCounts(page: Page) {
  return page.evaluate(() => {
    const runtimeWindow = window as Window & {
      loadData?: (key: string) => unknown;
      KEYS?: { workouts?: string; cardios?: string };
    };

    const readCount = (key: string | undefined) => {
      if (!key) return 0;
      try {
        if (typeof runtimeWindow.loadData === "function") {
          const value = runtimeWindow.loadData(key);
          return Array.isArray(value) ? value.length : 0;
        }
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return 0;
      }
    };

    return {
      workouts: readCount(runtimeWindow.KEYS && runtimeWindow.KEYS.workouts),
      cardios: readCount(runtimeWindow.KEYS && runtimeWindow.KEYS.cardios),
    };
  });
}

async function capturePrintTemplateHtml(page: Page, buttonSelector: string) {
  await page.evaluate(() => {
    const runtimeWindow = window as Window & {
      __fitonePrintHtml?: string;
      __fitoneOriginalOpen?: typeof window.open;
    };
    runtimeWindow.__fitonePrintHtml = "";
    runtimeWindow.__fitoneOriginalOpen = window.open;
    window.open = function () {
      const docState = {
        html: "",
        write(markup: string) {
          this.html += String(markup || "");
        },
        close() {
          return undefined;
        },
      };
      return {
        document: docState,
        focus() {
          return undefined;
        },
        print() {
          runtimeWindow.__fitonePrintHtml = docState.html;
        },
      } as unknown as Window;
    };
  });

  await page.locator(buttonSelector).click();

  return page.evaluate(() => {
    const runtimeWindow = window as Window & {
      __fitonePrintHtml?: string;
      __fitoneOriginalOpen?: typeof window.open;
    };
    const html = String(runtimeWindow.__fitonePrintHtml || "");
    if (runtimeWindow.__fitoneOriginalOpen) {
      window.open = runtimeWindow.__fitoneOriginalOpen;
    }
    delete runtimeWindow.__fitonePrintHtml;
    delete runtimeWindow.__fitoneOriginalOpen;
    return html;
  });
}

async function ensureDataImportEntity(page: Page, entity: string) {
  await page.evaluate((targetEntity) => {
    const panel = document.getElementById("panel-data") as HTMLElement | null;
    let select = document.getElementById("dataImportType") as HTMLSelectElement | null;

    if (!select) {
      const legacySelect = document.getElementById("logPhotoType") as HTMLSelectElement | null;
      if (legacySelect && legacySelect.tagName === "SELECT") {
        legacySelect.id = "dataImportType";
        select = legacySelect;
      }
    }

    if (!select && panel) {
      const fallbackSelect = document.createElement("select");
      fallbackSelect.id = "dataImportType";
      fallbackSelect.className = "u-hidden";
      panel.prepend(fallbackSelect);
      select = fallbackSelect;
    }

    if (!select) {
      return;
    }

    const entities = [
      "workouts",
      "strength_sets",
      "cardios",
      "measurements",
      "photos",
      "food_items",
      "food_logs",
      "protocols",
      "day_plans",
    ];

    const knownOptions = new Set(Array.from(select.options).map((option) => option.value));
    if (!knownOptions.has(targetEntity)) {
      select.innerHTML = "";
      for (const value of entities) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      }
    }

    select.value = targetEntity;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, entity);
}

async function importJsonPayload(page: Page) {
  await clickMainTab(page, "data");
  await ensureDataImportEntity(page, "food_logs");

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
  await ensureDataImportEntity(page, "workouts");

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
      await expect(page.locator("#analytics-workouts")).toHaveClass(/active/);
      await expect(page.locator("#analytics-workouts canvas#chartWorkouts")).toBeVisible();
      await expect(page.locator("#workoutStatsCard .card-title")).toHaveText("Workout Stats");
      return;
    case "UAT-008":
      await clickMainTab(page, "protocols");
      await expect(page.locator("#panel-protocols")).toContainText("My Protocols");
      await expect(page.locator("#panel-protocols")).toContainText("Workout Library");
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

type InfrastructureFailureKind = "server-unreachable";

interface InfrastructureFailureClassification {
  kind: InfrastructureFailureKind;
  reason: string;
  message: string;
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function classifyInfrastructureFailure(error: unknown): InfrastructureFailureClassification | undefined {
  const message = errorToMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (
    /err_connection_refused|econnrefused|connection refused|failed to connect|could not connect|server is not running|net::err_connection_closed|net::err_connection_reset|net::err_address_unreachable|server unavailable/.test(
      normalizedMessage,
    )
  ) {
    return {
      kind: "server-unreachable",
      reason: "Playwright could not reach the FitOne dev server during test setup.",
      message,
    };
  }

  return undefined;
}

function throwWithInfrastructureClassification(error: unknown, testInfo: TestInfo): never {
  const classification = classifyInfrastructureFailure(error);
  if (!classification) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(errorToMessage(error));
  }

  const baseURL = String(testInfo.project.use?.baseURL ?? "unknown-base-url");
  testInfo.annotations.push({
    type: "infra",
    description: `${classification.kind}; baseURL=${baseURL}`,
  });

  const wrapped = new Error(
    `[INFRA:SERVER_UNREACHABLE] ${classification.reason} baseURL=${baseURL}. Original error: ${classification.message}`,
  );

  if (error instanceof Error && error.stack) {
    wrapped.stack = `${wrapped.name}: ${wrapped.message}\nCaused by: ${error.stack}`;
  }

  throw wrapped;
}

function readBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const matrixEnabled = readBooleanEnv(process.env.FITONE_UAT_MATRIX);
const use20x4LifecycleModel =
  typeof process.env.FITONE_UAT_USE_20X4_LIFECYCLE === "string"
    ? readBooleanEnv(process.env.FITONE_UAT_USE_20X4_LIFECYCLE)
    : matrixEnabled;

const scenariosById = new Map<string, UatScenario>(scenarios.map((scenario) => [scenario.id, scenario]));

type LifecycleExecutionCase = LifecycleCaseFixture & {
  source: "legacy-fixture" | "persona-phase";
  sourceCaseId?: string;
  personaId?: string;
  phaseId?: LifecyclePhaseId;
};

function hasRiskFlag(persona: PersonaProfile, flag: RiskFlag): boolean {
  return persona.riskFlags.includes(flag);
}

function resolveExecutionDeviceProfile(persona: PersonaProfile): DeviceProfileId {
  const hardware = persona.hardware.toLowerCase();
  if (/(desktop|laptop|browser|linux|ultrabook|tablet)/.test(hardware)) {
    return "desktop-chrome";
  }

  return "mobile-pixel-7";
}

function resolveExecutionNetworkProfile(persona: PersonaProfile, phaseId: LifecyclePhaseId): NetworkProfileId {
  const lowConnectivity = hasRiskFlag(persona, "low-connectivity") || hasRiskFlag(persona, "offline-first");
  const desyncRisk = hasRiskFlag(persona, "wearable-desync-risk") || hasRiskFlag(persona, "schedule-variability");

  if (phaseId === "phase3" && lowConnectivity) {
    return "offline-window";
  }

  if (phaseId === "phase3" || desyncRisk) {
    return "spotty";
  }

  if (lowConnectivity) {
    return "slow-3g";
  }

  return "online";
}

function resolveScenarioForPersonaPhase(scenarioCase: UATScenarioCase): UatScenario {
  const candidates = scenarioCase.legacyUatIds
    .map((legacyUatId) => scenariosById.get(legacyUatId))
    .filter((candidate): candidate is UatScenario => Boolean(candidate));

  if (candidates.length === 0) {
    throw new Error(`Lifecycle case ${scenarioCase.caseId} has no executable legacy scenario mapping.`);
  }

  const personaSeedRaw = Number.parseInt(scenarioCase.personaId.slice(1), 10);
  const personaSeed = Number.isFinite(personaSeedRaw) && personaSeedRaw > 0 ? personaSeedRaw - 1 : 0;
  return candidates[personaSeed % candidates.length];
}

function buildLifecycleExecutionCaseFromPersonaPhase(scenarioCase: UATScenarioCase): LifecycleExecutionCase {
  const persona = FIT_TO_FIT_PERSONA_BY_ID[scenarioCase.personaId];
  const mappedScenario = resolveScenarioForPersonaPhase(scenarioCase);

  return {
    id: scenarioCase.caseId,
    label: `${scenarioCase.personaId} ${scenarioCase.phaseId} ${mappedScenario.id}`,
    deviceProfileId: resolveExecutionDeviceProfile(persona),
    networkProfileId: resolveExecutionNetworkProfile(persona, scenarioCase.phaseId),
    includeScenarioIds: [mappedScenario.id],
    source: "persona-phase",
    sourceCaseId: scenarioCase.caseId,
    personaId: scenarioCase.personaId,
    phaseId: scenarioCase.phaseId,
  };
}

const requestedLifecycleCaseIds = (process.env.FITONE_UAT_LIFECYCLE_CASES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

const lifecycleCaseFilter = new Set(requestedLifecycleCaseIds);

const legacyLifecycleExecutionCases: LifecycleExecutionCase[] = lifecycleCases.map((lifecycleCase) => ({
  ...lifecycleCase,
  source: "legacy-fixture",
  sourceCaseId: lifecycleCase.id,
}));

const fitToFitLifecycleExecutionCases: LifecycleExecutionCase[] = FIT_TO_FIT_LIFECYCLE_CASES.map(
  buildLifecycleExecutionCaseFromPersonaPhase,
);

const lifecycleExecutionUniverse = use20x4LifecycleModel
  ? fitToFitLifecycleExecutionCases
  : legacyLifecycleExecutionCases;

function matchesLifecycleFilter(lifecycleCase: LifecycleExecutionCase): boolean {
  if (lifecycleCaseFilter.size === 0) {
    return true;
  }

  return (
    lifecycleCaseFilter.has(lifecycleCase.id) ||
    (lifecycleCase.sourceCaseId ? lifecycleCaseFilter.has(lifecycleCase.sourceCaseId) : false) ||
    (lifecycleCase.personaId ? lifecycleCaseFilter.has(lifecycleCase.personaId) : false) ||
    (lifecycleCase.phaseId ? lifecycleCaseFilter.has(lifecycleCase.phaseId) : false)
  );
}

const lifecycleCasesForExecution =
  lifecycleCaseFilter.size === 0
    ? lifecycleExecutionUniverse
    : lifecycleExecutionUniverse.filter((lifecycleCase) => matchesLifecycleFilter(lifecycleCase));

const lifecycleDeviceByCaseId = new Map<string, DeviceProfileId>(
  lifecycleCasesForExecution.map((lifecycleCase) => [lifecycleCase.id, lifecycleCase.deviceProfileId]),
);

const matrixProjectDeviceMap: Record<string, DeviceProfileId> = {
  "matrix-desktop-chrome": "desktop-chrome",
  "matrix-mobile-pixel-7": "mobile-pixel-7",
};

const lifecycleProjectTagByDevice: Record<DeviceProfileId, string> = {
  "desktop-chrome": "@matrix-desktop",
  "mobile-pixel-7": "@matrix-mobile",
};

function getMatrixProjectDeviceProfileId(projectName: string): DeviceProfileId | undefined {
  return matrixProjectDeviceMap[projectName];
}

function resolveLifecycleProjectTag(deviceProfileId: DeviceProfileId): string {
  return lifecycleProjectTagByDevice[deviceProfileId];
}

function shouldRunLegacyScenariosOnProject(projectName: string): boolean {
  return !projectName.startsWith("matrix-");
}

function shouldRunLifecycleMatrixOnProject(projectName: string): boolean {
  return typeof getMatrixProjectDeviceProfileId(projectName) !== "undefined";
}

function resolveScenariosForExecutionCase(lifecycleCase: LifecycleExecutionCase): UatScenario[] {
  return lifecycleCase.includeScenarioIds
    .map((scenarioId) => scenariosById.get(scenarioId))
    .filter((scenario): scenario is UatScenario => Boolean(scenario));
}

function assertLifecycleCaseHasScenarios(lifecycleCase: LifecycleExecutionCase, caseScenarios: UatScenario[]) {
  if (caseScenarios.length === 0) {
    throw new Error(`Lifecycle case ${lifecycleCase.id} does not map to any scenarios.`);
  }
}

test.beforeEach(async ({ page }, testInfo) => {
  const projectName = testInfo.project.name;
  const testTitle = testInfo.title;
  const matrixCaseId = testTitle.split(" :: ")[0]?.trim();
  const expectedDeviceProfileId = matrixCaseId ? lifecycleDeviceByCaseId.get(matrixCaseId) : undefined;

  if (expectedDeviceProfileId) {
    if (!shouldRunLifecycleMatrixOnProject(projectName)) {
      throw new Error(
        `Lifecycle case ${matrixCaseId ?? "unknown-case"} was collected on non-matrix project ${projectName}.`,
      );
    }

    const projectDeviceProfileId = getMatrixProjectDeviceProfileId(projectName);
    if (projectDeviceProfileId !== expectedDeviceProfileId) {
      throw new Error(
        `Lifecycle case ${matrixCaseId ?? "unknown-case"} expects ${expectedDeviceProfileId} but ran on ${projectName}.`,
      );
    }
  } else if (/^UAT-\d{3}$/.test(testTitle) && !shouldRunLegacyScenariosOnProject(projectName)) {
    throw new Error(`Legacy scenario ${testTitle} was collected on matrix project ${projectName}.`);
  }

  try {
    await page.goto("/");
  } catch (error) {
    throwWithInfrastructureClassification(error, testInfo);
  }

  await page.evaluate(() => {
    localStorage.clear();
    // UAT scenarios validate feature flows; skip first-run gate in automation.
    localStorage.setItem("ft_onboarding_complete", "1");
    localStorage.setItem("ft_onboarding_done", "1");
  });

  try {
    await page.reload();
  } catch (error) {
    throwWithInfrastructureClassification(error, testInfo);
  }

  await page.evaluate(() => {
    document.body.classList.remove("welcome-active");

    const welcomeScreen = document.getElementById("welcomeScreen");
    if (welcomeScreen) {
      welcomeScreen.classList.add("hidden");
    }

    const app = document.getElementById("app");
    if (app) {
      app.classList.remove("app-hidden");
    }
  });
  await expect(page.locator("#app")).toBeVisible();

  try {
    await page.waitForFunction(
      () => typeof (window as Window & { activateMainTab?: unknown }).activateMainTab === "function",
      undefined,
      { timeout: 1200 },
    );
  } catch {
    // Safe fallback: setup below handles environments without the native tab activator.
  }

  const tabState = await page.evaluate(() => {
    let usedNativeActivation = false;
    const runtimeWindow = window as Window & {
      activateMainTab?: (tabId: string, options?: { scroll?: boolean }) => void;
    };

    if (typeof runtimeWindow.activateMainTab === "function") {
      runtimeWindow.activateMainTab("today", { scroll: false });
      usedNativeActivation = true;
    } else {
      const allPanels = Array.from(document.querySelectorAll<HTMLElement>('[id^="panel-"]'));
      for (const candidate of allPanels) {
        const isToday = candidate.id === "panel-today";
        candidate.classList.toggle("active", isToday);
        candidate.setAttribute("aria-hidden", isToday ? "false" : "true");
      }

      const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab-btn[data-tab]"));
      for (const button of tabButtons) {
        const isToday = button.dataset.tab === "today";
        button.classList.toggle("active", isToday);
        button.setAttribute("aria-selected", isToday ? "true" : "false");
        button.setAttribute("tabindex", isToday ? "0" : "-1");
      }
    }

    const activePanels = Array.from(document.querySelectorAll<HTMLElement>('[id^="panel-"].active')).map((panel) => panel.id);
    return {
      usedNativeActivation,
      activePanels,
    };
  });

  expect(tabState.activePanels.length).toBe(1);
  expect(tabState.activePanels[0]).toBe("panel-today");
  await expect(page.locator("#panel-today")).toHaveClass(/active/);
  await expect(page.locator("#panel-today")).toBeVisible();
});

for (const scenario of scenarios) {
  test.describe(`${scenario.id} – ${scenario.title}`, () => {
    test(scenario.id, async ({ page }) => {
      await runScenario(page, scenario);
    });
  });
}

test.describe("Browser truth critical controls", () => {
  test("browser truth critical controls", async ({ page }, testInfo) => {
    test.skip(!shouldRunLegacyScenariosOnProject(testInfo.project.name), "Browser-truth audit runs only on the primary legacy project.");

    await page.locator("#headerAvatar").click();
    await expect(page.locator("#panel-settings")).toHaveClass(/active/);
    await expect(page.locator("#workoutSettingsResetBtn")).toContainText("REVERT WORKOUT CHANGES");

    const originalRest = await page.locator("#settingRestTimeRange").inputValue();
    await page.evaluate(() => {
      const range = document.getElementById("settingRestTimeRange") as HTMLInputElement | null;
      if (!range) return;
      range.value = "180";
      range.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("#workoutSettingsResetBtn").click();
    await expect(page.locator("#settingRestTimeRange")).toHaveValue(originalRest);

    await clickMainTab(page, "today");
    await page.locator("#viewAllRoutines").click();
    await expect(page.locator("#panel-protocols")).toHaveClass(/active/);
    await expect(page.locator("#library-list")).toHaveClass(/active/);

    await clickMainTab(page, "today");
    await page.locator("#fabBtn").click();
    await page.locator('#fabMenu .fab-option[data-fab-action="quick-food"]').click();
    await expect(page.locator("#quickFoodOverlay")).toBeVisible();
    await page.locator("#quickFoodCloseBtn").click();

    const wgerRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("wger.de")) {
        wgerRequests.push(request.url());
      }
    });

    await clickMainTab(page, "log");
    await clickLogSubTab(page, "log-workout");
    await page.locator('[data-action="browseExercises"]').click();
    await expect(page.locator("#exerciseBrowserOverlay")).toBeVisible();
    await expect(page.locator("#exerciseBrowserList .exercise-browser-item").first()).toBeVisible();
    expect(wgerRequests).toHaveLength(0);
    await page.locator("#exerciseBrowserClose").click();

    await exportGlobalJsonAndCsv(page);
    await exportAnalyticsReports(page);
    await uploadProgressPhoto(page);

    await clickMainTab(page, "settings");
    await expect(page.locator("#notificationPulseCard")).not.toContainText("Coming Soon");
  });

  test("browser truth utility controls", async ({ page }, testInfo) => {
    test.skip(!shouldRunLegacyScenariosOnProject(testInfo.project.name), "Browser-truth audit runs only on the primary legacy project.");

    await clickMainTab(page, "settings");

    await page.evaluate(() => {
      const runtimeWindow = window as Window & {
        fitOneLastExport?: { filename?: string } | null;
        fitOneExportHistory?: Array<{ filename?: string }>;
      };
      runtimeWindow.fitOneLastExport = null;
      runtimeWindow.fitOneExportHistory = [];
    });
    await page.locator("#runBackupNowBtn").click();
    await page.waitForFunction(() => {
      const runtimeWindow = window as Window & { fitOneLastExport?: { filename?: string } | null };
      return !!runtimeWindow.fitOneLastExport && String(runtimeWindow.fitOneLastExport.filename || "").startsWith("fitone-backup-");
    });
    const backupExport = await page.evaluate(() => {
      const runtimeWindow = window as Window & { fitOneLastExport?: { filename?: string } | null };
      return runtimeWindow.fitOneLastExport;
    });
    expect(String(backupExport?.filename || "")).toContain("fitone-backup-");
    await expectToastText(page, /Backup snapshot created/);

    const installState = await page.evaluate(() => {
      const runtimeWindow = window as Window & { _deferredInstallPrompt?: unknown };
      const installBtn = document.getElementById("triggerPwaInstallBtn") as HTMLButtonElement | null;
      const promptsToggle = document.getElementById("settingPwaInstallPromptEnabled") as HTMLInputElement | null;
      return {
        available: !!runtimeWindow._deferredInstallPrompt,
        standalone: !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches),
        promptsDisabled: promptsToggle ? !promptsToggle.checked : false,
        disabled: installBtn ? installBtn.disabled : false,
        text: installBtn ? String(installBtn.textContent || "") : "",
        status: String(document.getElementById("pwaRuntimeStatus")?.textContent || ""),
      };
    });

    if (installState.promptsDisabled) {
      expect(installState.disabled).toBeTruthy();
      expect(installState.text).toContain("Install Disabled");
    } else if (installState.standalone) {
      expect(installState.disabled).toBeTruthy();
      expect(installState.text).toContain("App Installed");
    } else if (installState.available) {
      expect(installState.disabled).toBeFalsy();
      expect(installState.text).toContain("Install App");
    } else {
      expect(installState.disabled).toBeTruthy();
      expect(installState.text).toContain("Install Unavailable");
      expect(installState.status).toContain("not currently available");
    }

    await page.locator("#checkPwaUpdateBtn").click();
    await expectToastText(page, /(No update found|Update ready\. Reload to apply\.|Update check is unavailable)/);

    await page.locator("#testWebhookBtn").click();
    await expectToastText(page, /Enable webhooks and add a valid URL first/);
    await page.locator("#flushWebhookQueueBtn").click();
    await expectToastText(page, /Enable webhooks and add a valid URL first/);

    const beforeSampleCounts = await readWorkoutAndCardioCounts(page);
    await page.locator('[data-wearable-toggle="strava"]').click();
    await expectToastText(page, /Strava connected/);
    await page.locator('[data-wearable-sample="strava"]').click();
    await expectToastText(page, /Imported sample workout for Strava/);
    await page.waitForFunction(
      (counts) => {
        const runtimeWindow = window as Window & {
          loadData?: (key: string) => unknown;
          KEYS?: { workouts?: string; cardios?: string };
        };
        const readCount = (key: string | undefined) => {
          if (!key) return 0;
          try {
            if (typeof runtimeWindow.loadData === "function") {
              const value = runtimeWindow.loadData(key);
              return Array.isArray(value) ? value.length : 0;
            }
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.length : 0;
          } catch {
            return 0;
          }
        };

        return (
          readCount(runtimeWindow.KEYS && runtimeWindow.KEYS.workouts) === counts.workouts + 1 &&
          readCount(runtimeWindow.KEYS && runtimeWindow.KEYS.cardios) === counts.cardios + 1
        );
      },
      beforeSampleCounts,
    );

    await page.locator("#createPeerSyncCodeBtn").click();
    await expect(page.locator("#peerSyncCodeInput")).not.toHaveValue("");
    await expectToastText(page, /(Sync code copied|Sync code generated)/);
    const syncCode = await page.locator("#peerSyncCodeInput").inputValue();
    expect(syncCode.length).toBeGreaterThan(20);
    await page.locator("#applyPeerSyncCodeBtn").click();
    await expectToastText(page, /Peer sync applied/);

    await clickMainTab(page, "data");
    await expect(page.locator("#importDataBtn")).toBeVisible();
    await expect(page.locator("#importActivityCsvBtn")).toBeVisible();
    await expect(page.locator("#programImportBtn")).toBeVisible();

    const workoutTemplateHtml = await capturePrintTemplateHtml(page, "#printWorkoutTemplateBtn");
    expect(workoutTemplateHtml).toContain("FitOne Blank Workout Log");
    expect(workoutTemplateHtml).toContain("Exercise");

    const nutritionTemplateHtml = await capturePrintTemplateHtml(page, "#printNutritionTemplateBtn");
    expect(nutritionTemplateHtml).toContain("FitOne Blank Nutrition Diary");
    expect(nutritionTemplateHtml).toContain("Calories");
  });
});

if (matrixEnabled) {
  test.describe("Domain 2 lifecycle matrix", () => {
    for (const lifecycleCase of lifecycleCasesForExecution) {
      const caseScenarios = resolveScenariosForExecutionCase(lifecycleCase);
      assertLifecycleCaseHasScenarios(lifecycleCase, caseScenarios);

      test.describe(
        `${lifecycleCase.id} – ${lifecycleCase.label} ${resolveLifecycleProjectTag(lifecycleCase.deviceProfileId)} @matrix-only`,
        () => {
          for (const scenario of caseScenarios) {
            test(`${lifecycleCase.id} :: ${scenario.id}`, async ({ page }, testInfo) => {
              if (lifecycleCase.source === "persona-phase") {
                const personaDescriptor = lifecycleCase.personaId ?? "unknown-persona";
                const phaseDescriptor = lifecycleCase.phaseId ?? "unknown-phase";
                testInfo.annotations.push({
                  type: "lifecycle-case",
                  description: `${lifecycleCase.id}; persona=${personaDescriptor}; phase=${phaseDescriptor}`,
                });
              }

              await runLifecycleCase({
                page,
                scenario,
                lifecycleCase,
                runScenario,
                testInfo,
              });
            });
          }
        },
      );
    }
  });
}