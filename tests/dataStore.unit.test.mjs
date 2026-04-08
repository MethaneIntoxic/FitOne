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

function loadDataStoreContext() {
  const fileUrl = new URL("../src/dataStore.js", import.meta.url);
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
    Date,
    Math,
    JSON,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

describe("dataStore core helpers", () => {
  let ctx;

  beforeEach(() => {
    ctx = loadDataStoreContext();
  });

  it("normalizes experience levels safely", () => {
    expect(ctx.normalizeExperienceLevel("advanced")).toBe("advanced");
    expect(ctx.normalizeExperienceLevel("COMPETITOR")).toBe("competitor");
    expect(ctx.normalizeExperienceLevel("unknown")).toBe("beginner");
  });

  it("calculates monotonic XP thresholds", () => {
    const lv1 = ctx.getXpRequiredForLevel(1);
    const lv5 = ctx.getXpRequiredForLevel(5);
    const lv10 = ctx.getXpRequiredForLevel(10);
    expect(lv1).toBeGreaterThan(0);
    expect(lv5).toBeGreaterThan(lv1);
    expect(lv10).toBeGreaterThan(lv5);
  });

  it("awards XP and levels up when threshold is crossed", () => {
    const start = ctx.loadXpProfile();
    expect(start.level).toBe(1);
    const gain = ctx.getXpRequiredForLevel(1) + 10;
    const result = ctx.grantXP(gain, "unit-test", { source: "test" });
    expect(result.leveledUp).toBe(true);
    expect(result.profile.level).toBeGreaterThan(1);
    expect(result.profile.totalEarned).toBeGreaterThanOrEqual(gain);
  });
});
