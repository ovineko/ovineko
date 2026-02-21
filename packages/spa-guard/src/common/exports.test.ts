import { describe, expect, it } from "vitest";

describe("common/index exports", () => {
  it("does not export startVersionCheck (moved to runtime)", async () => {
    const mod = await import("./index");
    expect(mod).not.toHaveProperty("startVersionCheck");
  });

  it("does not export stopVersionCheck (moved to runtime)", async () => {
    const mod = await import("./index");
    expect(mod).not.toHaveProperty("stopVersionCheck");
  });

  it("still exports events namespace", async () => {
    const mod = await import("./index");
    expect(mod.events).toBeDefined();
  });

  it("still exports listen function", async () => {
    const mod = await import("./index");
    expect(mod.listen).toBeDefined();
    expect(typeof mod.listen).toBe("function");
  });

  it("still exports options namespace", async () => {
    const mod = await import("./index");
    expect(mod.options).toBeDefined();
  });

  it("still exports retry control functions", async () => {
    const mod = await import("./index");
    expect(typeof mod.disableDefaultRetry).toBe("function");
    expect(typeof mod.enableDefaultRetry).toBe("function");
    expect(typeof mod.isDefaultRetryEnabled).toBe("function");
  });
});
