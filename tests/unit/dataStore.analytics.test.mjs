import fs from "node:fs";
import vm from "node:vm";
import { describe, it, expect, beforeEach } from "vitest";

function createLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index) {
      return Array.from(store.keys())[index] || null;
    },
    get length() {
      return store.size;
    },
  };
}

function createDocumentMock() {
  return {
    getElementById() {
      return null;
    },
    createElement() {
      let text = "";
      return {
        innerHTML: "",
        set textContent(value) {
          text = String(value || "");
          this.innerHTML = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
        },
        get textContent() {
          return text;
        },
      };
    },
  };
}

function isoOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function loadDataStoreContext() {
  const fileUrl = new URL("../../src/dataStore.js", import.meta.url);
  const code = fs.readFileSync(fileUrl, "utf8");
  const localStorage = createLocalStorage();
  const context = {
    console,
    localStorage,
    document: createDocumentMock(),
    navigator: {},
    crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000000" },
    showToast: () => {},
    window: {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    JSON,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

describe("dataStore analytics and progression helpers", () => {
  let ctx;

  beforeEach(() => {
    ctx = loadDataStoreContext();
  });

  it("calculates 1RM with Epley formula", () => {
    expect(ctx.calculate1RM(100, 5)).toBeCloseTo(116.7, 1);
    expect(ctx.calculate1RM(120, 1)).toBe(120);
    expect(ctx.calculate1RM(0, 5)).toBe(0);
  });

  it("computes workout volume from set arrays and legacy fields", () => {
    const workout = {
      exercises: [
        {
          sets: [
            { weight: 80, reps: 5 },
            { weight: 85, reps: 5 },
          ],
        },
        {
          weight: 30,
          reps: 10,
          sets: 3,
        },
      ],
    };
    expect(ctx.getWorkoutVolume(workout)).toBe(80 * 5 + 85 * 5 + 30 * 10 * 3);
  });

  it("returns readiness score for a date using wellness modifiers", () => {
    const day = isoOffset(0);
    ctx.saveData("ft_wellness", [
      {
        id: "w1",
        date: day,
        sleep: 5,
        soreness: 5,
        energy: 5,
      },
    ]);
    ctx.saveData("ft_workouts", []);

    const score = ctx.calculateReadinessForDate(day);
    expect(score).toBeGreaterThanOrEqual(65);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("applies streak freeze rules across missing days", () => {
    const s = ctx.defaultSettings();
    s.streakActiveRule = "any-log";
    s.streakFreezesPerWeek = 1;
    s.streakRestProtection = true;
    ctx.updateSettings(s);

    ctx.saveData("ft_food", [
      { id: "f0", date: isoOffset(0), calories: 400 },
      { id: "f2", date: isoOffset(-2), calories: 500 },
    ]);
    ctx.saveData("ft_workouts", []);
    ctx.saveData("ft_body", []);
    ctx.saveData("ft_wellness", []);

    expect(ctx.calculateStreak()).toBe(3);
  });

  it("estimates adaptive TDEE once enough weight and food data exists", () => {
    const start = isoOffset(-8);
    const end = isoOffset(0);

    ctx.saveData("ft_body", [
      { id: "b1", date: start, weight: 80, timestamp: Date.now() - 8 * 86400000 },
      { id: "b2", date: end, weight: 79.5, timestamp: Date.now() },
    ]);

    const food = [];
    for (let i = -8; i <= 0; i++) {
      food.push({
        id: "f" + i,
        date: isoOffset(i),
        calories: 2200,
        protein: 160,
        carbs: 230,
        fat: 70,
      });
    }
    ctx.saveData("ft_food", food);

    const result = ctx.calculateAdaptiveTDEE();
    expect(result.status).toBe("ready");
    expect(result.estimatedTDEE).toBeGreaterThanOrEqual(1000);
    expect(result.estimatedTDEE).toBeLessThanOrEqual(5000);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("detects weight and strength plateaus", () => {
    ctx.saveData("ft_body", [
      { id: "b1", date: isoOffset(-24), weight: 80.0 },
      { id: "b2", date: isoOffset(-14), weight: 80.1 },
      { id: "b3", date: isoOffset(0), weight: 80.05 },
    ]);

    ctx.saveData("ft_workouts", [
      {
        id: "w1",
        date: isoOffset(-10),
        exercises: [{ name: "Barbell Bench Press", weight: 80, reps: 5, sets: 3 }],
      },
      {
        id: "w2",
        date: isoOffset(-5),
        exercises: [{ name: "Barbell Bench Press", weight: 80, reps: 5, sets: 3 }],
      },
      {
        id: "w3",
        date: isoOffset(-1),
        exercises: [{ name: "Barbell Bench Press", weight: 80, reps: 5, sets: 3 }],
      },
    ]);

    const plateaus = ctx.detectPlateau();
    const types = plateaus.map((p) => p.type);
    expect(types).toContain("weight");
    expect(types).toContain("strength");
  });
});
