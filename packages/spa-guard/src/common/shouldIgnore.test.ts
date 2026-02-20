import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./options", () => ({
  getOptions: vi.fn(),
}));

import { getOptions } from "./options";
import { shouldIgnoreBeacon, shouldIgnoreMessages } from "./shouldIgnore";

const mockGetOptions = vi.mocked(getOptions);

describe("shouldIgnoreMessages", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("empty ignoredErrors array (nothing ignored)", () => {
    beforeEach(() => {
      mockGetOptions.mockReturnValue({ ignoredErrors: [] });
    });

    it("returns false when ignoredErrors is empty and message is provided", () => {
      expect(shouldIgnoreMessages(["some error message"])).toBe(false);
    });

    it("returns false when ignoredErrors is empty and multiple messages are provided", () => {
      expect(shouldIgnoreMessages(["error one", "error two"])).toBe(false);
    });

    it("returns false when ignoredErrors is empty and no messages are provided", () => {
      expect(shouldIgnoreMessages([])).toBe(false);
    });

    it("returns false when ignoredErrors is undefined (defaults to empty)", () => {
      mockGetOptions.mockReturnValue({});
      expect(shouldIgnoreMessages(["some error message"])).toBe(false);
    });
  });

  describe("ignoredErrors pattern matching (exact match)", () => {
    beforeEach(() => {
      mockGetOptions.mockReturnValue({ ignoredErrors: ["ChunkLoadError"] });
    });

    it("returns true when message exactly matches an ignored pattern", () => {
      expect(shouldIgnoreMessages(["ChunkLoadError"])).toBe(true);
    });

    it("returns false when message does not match any ignored pattern", () => {
      expect(shouldIgnoreMessages(["SomeOtherError"])).toBe(false);
    });

    it("returns true when one of multiple messages matches an ignored pattern", () => {
      expect(shouldIgnoreMessages(["unrelated error", "ChunkLoadError"])).toBe(true);
    });

    it("returns false when no message matches any ignored pattern", () => {
      expect(shouldIgnoreMessages(["unrelated error", "another error"])).toBe(false);
    });
  });

  describe("ignoredErrors substring matching", () => {
    beforeEach(() => {
      mockGetOptions.mockReturnValue({ ignoredErrors: ["chunk"] });
    });

    it("returns true when message contains the ignored substring", () => {
      expect(shouldIgnoreMessages(["Failed to load chunk 123"])).toBe(true);
    });

    it("returns true when message starts with the ignored substring", () => {
      expect(shouldIgnoreMessages(["chunk load error"])).toBe(true);
    });

    it("returns true when message ends with the ignored substring", () => {
      expect(shouldIgnoreMessages(["loading a chunk"])).toBe(true);
    });

    it("returns false when message does not contain the ignored substring", () => {
      expect(shouldIgnoreMessages(["module load failure"])).toBe(false);
    });

    it("returns true when ignored pattern is a substring of a longer message", () => {
      mockGetOptions.mockReturnValue({ ignoredErrors: ["TypeError"] });
      expect(shouldIgnoreMessages(["Uncaught TypeError: Cannot read property"])).toBe(true);
    });

    it("matches against multiple ignored patterns (any match returns true)", () => {
      mockGetOptions.mockReturnValue({ ignoredErrors: ["chunk", "network", "timeout"] });
      expect(shouldIgnoreMessages(["network connection failed"])).toBe(true);
    });

    it("returns false when none of multiple ignored patterns match", () => {
      mockGetOptions.mockReturnValue({ ignoredErrors: ["chunk", "network", "timeout"] });
      expect(shouldIgnoreMessages(["unexpected error occurred"])).toBe(false);
    });
  });

  describe("case-sensitive matching", () => {
    beforeEach(() => {
      mockGetOptions.mockReturnValue({ ignoredErrors: ["ChunkLoadError"] });
    });

    it("returns false when message matches only by different casing (matching is case-sensitive)", () => {
      expect(shouldIgnoreMessages(["chunkloaderror"])).toBe(false);
    });

    it("returns false for all-uppercase version of ignored pattern", () => {
      expect(shouldIgnoreMessages(["CHUNKLOADERROR"])).toBe(false);
    });

    it("returns true for exact case match", () => {
      expect(shouldIgnoreMessages(["ChunkLoadError occurred"])).toBe(true);
    });
  });

  describe("edge cases: undefined and non-string values in messages array", () => {
    beforeEach(() => {
      mockGetOptions.mockReturnValue({ ignoredErrors: ["ignored-error"] });
    });

    it("returns false when messages array contains only undefined values", () => {
      expect(shouldIgnoreMessages([undefined, undefined])).toBe(false);
    });

    it("returns false for empty messages array", () => {
      expect(shouldIgnoreMessages([])).toBe(false);
    });

    it("skips undefined values and checks remaining string messages", () => {
      expect(shouldIgnoreMessages([undefined, "ignored-error"])).toBe(true);
    });

    it("returns false when only undefined values are present and pattern would match string", () => {
      expect(shouldIgnoreMessages([undefined])).toBe(false);
    });

    it("handles mixed undefined and non-matching strings", () => {
      expect(shouldIgnoreMessages([undefined, "unrelated error", undefined])).toBe(false);
    });

    it("processes string messages even when some array entries are undefined", () => {
      expect(
        shouldIgnoreMessages(["first unrelated", undefined, "contains ignored-error here"]),
      ).toBe(true);
    });
  });
});

describe("shouldIgnoreBeacon", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("beacon with errorMessage", () => {
    beforeEach(() => {
      mockGetOptions.mockReturnValue({ ignoredErrors: ["ChunkLoadError"] });
    });

    it("returns true when errorMessage matches an ignored pattern", () => {
      expect(shouldIgnoreBeacon({ errorMessage: "ChunkLoadError: chunk not found" })).toBe(true);
    });

    it("returns false when errorMessage does not match any ignored pattern", () => {
      expect(shouldIgnoreBeacon({ errorMessage: "unexpected error" })).toBe(false);
    });
  });

  describe("beacon with eventMessage", () => {
    beforeEach(() => {
      mockGetOptions.mockReturnValue({ ignoredErrors: ["Script error"] });
    });

    it("returns true when eventMessage matches an ignored pattern", () => {
      expect(shouldIgnoreBeacon({ eventMessage: "Script error." })).toBe(true);
    });

    it("returns false when eventMessage does not match any ignored pattern", () => {
      expect(shouldIgnoreBeacon({ eventMessage: "some other event" })).toBe(false);
    });
  });

  describe("beacon with both errorMessage and eventMessage", () => {
    beforeEach(() => {
      mockGetOptions.mockReturnValue({ ignoredErrors: ["ignored"] });
    });

    it("returns true when errorMessage matches even if eventMessage does not", () => {
      expect(
        shouldIgnoreBeacon({ errorMessage: "this is ignored", eventMessage: "normal event" }),
      ).toBe(true);
    });

    it("returns true when eventMessage matches even if errorMessage does not", () => {
      expect(
        shouldIgnoreBeacon({ errorMessage: "normal error", eventMessage: "this is ignored too" }),
      ).toBe(true);
    });

    it("returns false when neither errorMessage nor eventMessage matches", () => {
      expect(
        shouldIgnoreBeacon({ errorMessage: "normal error", eventMessage: "normal event" }),
      ).toBe(false);
    });

    it("returns true when both messages match ignored patterns", () => {
      expect(
        shouldIgnoreBeacon({ errorMessage: "ignored error", eventMessage: "ignored event" }),
      ).toBe(true);
    });
  });

  describe("beacon with missing message fields", () => {
    beforeEach(() => {
      mockGetOptions.mockReturnValue({ ignoredErrors: ["ignored"] });
    });

    it("returns false when beacon has no errorMessage and no eventMessage", () => {
      expect(shouldIgnoreBeacon({})).toBe(false);
    });

    it("returns false when errorMessage is undefined and eventMessage is absent", () => {
      expect(shouldIgnoreBeacon({ errorMessage: undefined })).toBe(false);
    });

    it("returns false when eventMessage is undefined and errorMessage is absent", () => {
      expect(shouldIgnoreBeacon({ eventMessage: undefined })).toBe(false);
    });
  });

  describe("empty ignoredErrors array", () => {
    beforeEach(() => {
      mockGetOptions.mockReturnValue({ ignoredErrors: [] });
    });

    it("returns false even when errorMessage is present", () => {
      expect(shouldIgnoreBeacon({ errorMessage: "ChunkLoadError" })).toBe(false);
    });

    it("returns false even when eventMessage is present", () => {
      expect(shouldIgnoreBeacon({ eventMessage: "script error" })).toBe(false);
    });
  });
});
