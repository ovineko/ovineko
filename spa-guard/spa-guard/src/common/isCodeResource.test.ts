import { describe, expect, it } from "vitest";

import { isCodeResource } from "./isCodeResource";

describe("isCodeResource", () => {
  it.each([
    ["stylesheet", undefined],
    ["modulepreload", undefined],
    ["preload", "style"],
    ["preload", "worker"],
    ["preload", "document"],
    ["prefetch", "script"],
  ])("classifies rel=%s as=%s links as code", (rel, resourceType) => {
    const link = document.createElement("link");
    link.rel = rel;
    if (resourceType) link.as = resourceType;
    expect(isCodeResource(link)).toBe(true);
  });

  it.each([
    ["preload", "font"],
    ["preload", "image"],
    ["icon", undefined],
  ])("does not classify rel=%s as=%s links as code", (rel, resourceType) => {
    const link = document.createElement("link");
    link.rel = rel;
    if (resourceType) link.as = resourceType;
    link.href = "/resource.css";
    expect(isCodeResource(link)).toBe(false);
  });

  it("does not let a non-code as value become code through the URL suffix", () => {
    const link = document.createElement("link");
    link.as = "font";
    link.href = "/resource.css";
    expect(isCodeResource(link)).toBe(false);
  });

  it.each([
    ["/resource.js", true],
    ["/resource.mjs", true],
    ["/resource.cjs", true],
    ["/resource.css", true],
    ["/resource.png", false],
    ["/resource.js?cache=1#fragment", true],
  ])("uses the URL extension when link metadata is absent: %s", (href, expected) => {
    const link = document.createElement("link");
    link.href = href;
    expect(isCodeResource(link)).toBe(expected);
  });

  it("handles missing attributes and unexpected targets defensively", () => {
    expect(isCodeResource(document.createElement("link"))).toBe(false);
    expect(isCodeResource({})).toBe(false);
    expect(isCodeResource(null)).toBe(false);
  });
});
