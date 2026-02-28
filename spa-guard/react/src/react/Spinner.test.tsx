import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@ovineko/spa-guard/_internal", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getOptions: vi.fn(),
  };
});

import { getOptions } from "@ovineko/spa-guard/_internal";

import { Spinner } from "./Spinner";

const mockGetOptions = vi.mocked(getOptions);

describe("Spinner", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when spinner is disabled", () => {
    mockGetOptions.mockReturnValue({ html: { spinner: { disabled: true } } });
    const { container } = render(<Spinner />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when no spinner content is available", () => {
    mockGetOptions.mockReturnValue({ html: { spinner: { disabled: false } } });
    const { container } = render(<Spinner />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when spinner option is undefined", () => {
    mockGetOptions.mockReturnValue({});
    const { container } = render(<Spinner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders spinner content when available", () => {
    mockGetOptions.mockReturnValue({
      html: { spinner: { content: "<div>Loading...</div>", disabled: false } },
    });
    const { container } = render(<Spinner />);
    expect(container.querySelector("div div")).not.toBeNull();
    expect(container.textContent).toBe("Loading...");
  });

  it("forwards props to wrapper div", () => {
    mockGetOptions.mockReturnValue({
      html: { spinner: { content: "<span>Spin</span>", disabled: false } },
    });
    const { container } = render(<Spinner className="my-spinner" data-testid="spinner" />);
    const wrapper = container.firstChild as HTMLDivElement;
    expect(wrapper.className).toBe("my-spinner");
    expect(wrapper.dataset.testid).toBe("spinner");
  });

  it("renders custom SVG spinner content", () => {
    const customSvg = '<svg width="24" height="24"><circle r="10" cx="12" cy="12"/></svg>';
    mockGetOptions.mockReturnValue({
      html: { spinner: { content: customSvg, disabled: false } },
    });
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
