import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { expect } from "vitest";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

Object.defineProperty(globalThis.window, "location", {
  value: { reload: vi.fn() },
  writable: true,
});
