import { existsSync, renameSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BACKUP_FILENAME } from "./config";
import { restore } from "./restore";

vi.mock("node:fs");
vi.mock("node:path", () => ({
  resolve: vi.fn((...args: string[]) => args.join("/")),
}));

const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit");
});
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  vi.clearAllMocks();
});

describe("restore", () => {
  it("exits if backup file does not exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);

    expect(() => restore()).toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining(BACKUP_FILENAME));
  });

  it("renames backup file back to package.json", () => {
    vi.mocked(existsSync).mockReturnValue(true);

    restore();

    expect(renameSync).toHaveBeenCalledWith(
      expect.stringContaining(BACKUP_FILENAME),
      expect.stringContaining("package.json"),
    );
  });

  it("logs success message", () => {
    vi.mocked(existsSync).mockReturnValue(true);

    restore();

    expect(mockConsoleLog).toHaveBeenCalledWith("✓ package.json restored");
  });
});
