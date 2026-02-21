import { describe, expect, it } from "vitest";

describe("runtime/index exports", () => {
  it("exports startVersionCheck function", async () => {
    const mod = await import("./index");
    expect(mod.startVersionCheck).toBeDefined();
    expect(typeof mod.startVersionCheck).toBe("function");
  });

  it("exports stopVersionCheck function", async () => {
    const mod = await import("./index");
    expect(mod.stopVersionCheck).toBeDefined();
    expect(typeof mod.stopVersionCheck).toBe("function");
  });

  it("exports getState function", async () => {
    const mod = await import("./index");
    expect(mod.getState).toBeDefined();
    expect(typeof mod.getState).toBe("function");
  });

  it("exports subscribeToState function", async () => {
    const mod = await import("./index");
    expect(mod.subscribeToState).toBeDefined();
    expect(typeof mod.subscribeToState).toBe("function");
  });

  it("exports recommendedSetup function", async () => {
    const mod = await import("./index");
    expect(mod.recommendedSetup).toBeDefined();
    expect(typeof mod.recommendedSetup).toBe("function");
  });
});
