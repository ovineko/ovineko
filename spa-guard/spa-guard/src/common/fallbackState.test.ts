import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isInFallbackMode, resetFallbackMode, setFallbackMode } from "./fallbackState";

const setupMockWindow = (): void => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
    writable: true,
  });
};

describe("isInFallbackMode", () => {
  beforeEach(() => {
    setupMockWindow();
  });

  afterEach(() => {
    resetFallbackMode();
  });

  it("returns false by default", () => {
    expect(isInFallbackMode()).toBe(false);
  });

  it("returns true after setFallbackMode", () => {
    setFallbackMode();
    expect(isInFallbackMode()).toBe(true);
  });

  it("returns false after resetFallbackMode", () => {
    setFallbackMode();
    resetFallbackMode();
    expect(isInFallbackMode()).toBe(false);
  });
});

describe("setFallbackMode", () => {
  beforeEach(() => {
    setupMockWindow();
  });

  afterEach(() => {
    resetFallbackMode();
  });

  it("makes isInFallbackMode return true", () => {
    setFallbackMode();
    expect(isInFallbackMode()).toBe(true);
  });

  it("is idempotent — calling twice still returns true", () => {
    setFallbackMode();
    setFallbackMode();
    expect(isInFallbackMode()).toBe(true);
  });
});

describe("resetFallbackMode", () => {
  beforeEach(() => {
    setupMockWindow();
  });

  it("makes isInFallbackMode return false after set", () => {
    setFallbackMode();
    resetFallbackMode();
    expect(isInFallbackMode()).toBe(false);
  });

  it("does not throw when called without prior setFallbackMode", () => {
    expect(() => resetFallbackMode()).not.toThrow();
  });
});
