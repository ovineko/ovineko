/* eslint-disable react-perf/jsx-no-new-object-as-prop */
/* eslint-disable react-perf/jsx-no-new-array-as-prop */
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";

import { render, screen } from "@testing-library/react";
import * as v from "valibot";
import { describe, expect, it } from "vitest";

import {
  createRouteWithoutParams,
  createRouteWithParams,
  optionalSearchParams,
  setGlobalErrorRedirect,
  URLParseError,
} from "./index";

describe("searchParamsToString", () => {
  const route = createRouteWithParams("/users/:id", {
    params: v.object({ id: v.string() }),
    searchParams: v.object({
      filter: v.optional(v.string()),
      sort: v.optional(v.string()),
    }),
  });

  it("should generate path without search params", () => {
    expect(route.path({ id: "123" })).toBe("/users/123");
  });

  it("should generate path with single search param", () => {
    const path = route.path({ id: "123" }, { sort: "name" });
    expect(path).toBe("/users/123?sort=name");
  });

  it("should generate path with multiple search params", () => {
    const path = route.path({ id: "123" }, { filter: "active", sort: "name" });
    expect(path).toContain("/users/123?");
    expect(path).toContain("sort=name");
    expect(path).toContain("filter=active");
  });

  it("should handle array values in search params", () => {
    const routeWithArray = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
      searchParams: v.object({ tags: v.optional(v.array(v.string())) }),
    });
    const path = routeWithArray.path({ id: "123" }, { tags: ["a", "b", "c"] });
    expect(path).toBe("/users/123?tags=a&tags=b&tags=c");
  });

  it("should skip undefined values", () => {
    const path = route.path({ id: "123" }, { filter: undefined, sort: undefined });
    expect(path).toBe("/users/123");
  });

  it("should handle empty search params object", () => {
    const path = route.path({ id: "123" }, {});
    expect(path).toBe("/users/123");
  });

  it("should handle special characters in search params", () => {
    const path = route.path({ id: "123" }, { sort: "hello world" });
    expect(path).toContain("sort=hello+world");
  });

  it("should generate path with hash", () => {
    const path = route.path({ id: "123" }, undefined, "section");
    expect(path).toBe("/users/123#section");
  });

  it("should generate path with search params and hash", () => {
    const path = route.path({ id: "123" }, { sort: "name" }, "top");
    expect(path).toBe("/users/123?sort=name#top");
  });
});

describe("createRouteWithParams", () => {
  describe("parseURLParams", () => {
    it("should parse basic params", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
      });
      const params = route.parseURLParams("https://example.com/users/123");
      expect(params).toEqual({ id: "123" });
    });

    it("should parse multiple params", () => {
      const route = createRouteWithParams("/orgs/:org/repos/:repo", {
        params: v.object({ org: v.string(), repo: v.string() }),
      });
      const params = route.parseURLParams("https://example.com/orgs/facebook/repos/react");
      expect(params).toEqual({ org: "facebook", repo: "react" });
    });

    it("should decode URL-encoded params", () => {
      const route = createRouteWithParams("/users/:name", {
        params: v.object({ name: v.string() }),
      });
      const params = route.parseURLParams("https://example.com/users/john%20doe");
      expect(params).toEqual({ name: "john doe" });
    });

    it("should handle special characters", () => {
      const route = createRouteWithParams("/search/:query", {
        params: v.object({ query: v.string() }),
      });
      const params = route.parseURLParams("https://example.com/search/100%25");
      expect(params).toEqual({ query: "100%" });
    });

    it("should decode UTF-8 sequences", () => {
      const route = createRouteWithParams("/users/:name", {
        params: v.object({ name: v.string() }),
      });
      const params = route.parseURLParams("https://example.com/users/caf%C3%A9");
      expect(params).toEqual({ name: "café" });
    });

    it("should throw URLParseError for invalid URL", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
      });
      expect(() => route.parseURLParams("not-a-url")).toThrow(URLParseError);
      expect(() => route.parseURLParams("not-a-url")).toThrow(/Invalid URL/);
    });

    it("should throw URLParseError for mismatched pattern", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
      });
      expect(() => route.parseURLParams("https://example.com/posts/123")).toThrow(URLParseError);
      expect(() => route.parseURLParams("https://example.com/posts/123")).toThrow(
        /doesn't match pattern/,
      );
    });

    it("should throw URLParseError for missing params", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
      });
      expect(() => route.parseURLParams("https://example.com/users")).toThrow(URLParseError);
      expect(() => route.parseURLParams("https://example.com/users")).toThrow(
        /Missing required parameter/,
      );
    });

    it("should provide helpful error context", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
      });
      try {
        route.parseURLParams("https://example.com/posts/123");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(URLParseError);
        expect((error as URLParseError).context).toHaveProperty("pattern", "/users/:id");
        expect((error as URLParseError).context).toHaveProperty("pathname", "/posts/123");
      }
    });

    it("should filter empty path segments", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
      });
      const params = route.parseURLParams("https://example.com//users//123//");
      expect(params).toEqual({ id: "123" });
    });

    it("should handle root path", () => {
      const route = createRouteWithParams("/", {
        params: v.object({}),
      });
      const params = route.parseURLParams("https://example.com/");
      expect(params).toEqual({});
    });
  });

  describe("path generation", () => {
    it("should generate simple path", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
      });
      expect(route.path({ id: "123" })).toBe("/users/123");
    });

    it("should generate path with multiple params", () => {
      const route = createRouteWithParams("/orgs/:org/repos/:repo", {
        params: v.object({ org: v.string(), repo: v.string() }),
      });
      expect(route.path({ org: "fb", repo: "react" })).toBe("/orgs/fb/repos/react");
    });

    it("should handle special characters in params", () => {
      const route = createRouteWithParams("/users/:name", {
        params: v.object({ name: v.string() }),
      });
      // generatePath from react-router doesn't encode params
      expect(route.path({ name: "john doe" })).toBe("/users/john doe");
    });
  });

  describe("Link component", () => {
    it("should render link with correct href", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
      });
      const params = { id: "123" };
      render(
        <MemoryRouter>
          <route.Link params={params}>View User</route.Link>
        </MemoryRouter>,
      );

      const link = screen.getByText("View User");
      // @ts-expect-error - jest-dom matcher
      expect(link).toBeInTheDocument();
      // @ts-expect-error - jest-dom matcher
      expect(link).toHaveAttribute("href", "/users/123");
    });

    it("should include search params in href", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
        searchParams: v.object({ tab: v.string() }),
      });
      const params = { id: "123" };
      const searchParams = { tab: "settings" };

      render(
        <MemoryRouter>
          <route.Link params={params} searchParams={searchParams}>
            View User
          </route.Link>
        </MemoryRouter>,
      );

      const link = screen.getByText("View User");
      expect(link.getAttribute("href")).toContain("/users/123?tab=settings");
    });

    it("should pass through additional props", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
      });
      const params = { id: "123" };
      render(
        <MemoryRouter>
          <route.Link className="custom-link" data-testid="user-link" params={params}>
            View User
          </route.Link>
        </MemoryRouter>,
      );

      const link = screen.getByTestId("user-link");
      // @ts-expect-error - jest-dom matcher
      expect(link).toHaveClass("custom-link");
    });

    it("should merge custom state with prevPath", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
      });
      const params = { id: "123" };
      const state = { scrollTop: 100 };
      const initialEntries = ["/current"];
      render(
        <MemoryRouter initialEntries={initialEntries}>
          <route.Link params={params} state={state}>
            View User
          </route.Link>
        </MemoryRouter>,
      );

      const link = screen.getByText("View User");
      // @ts-expect-error - jest-dom matcher
      expect(link).toBeInTheDocument();
      // Note: actual state testing requires integration with router
    });
  });

  describe("pattern property", () => {
    it("should expose the pattern", () => {
      const route = createRouteWithParams("/users/:id", {
        params: v.object({ id: v.string() }),
      });
      expect(route.pattern).toBe("/users/:id");
    });
  });
});

describe("createRouteWithoutParams", () => {
  describe("path generation", () => {
    it("should generate path without params", () => {
      const route = createRouteWithoutParams("/home");
      expect(route.path()).toBe("/home");
    });

    it("should generate path with search params", () => {
      const route = createRouteWithoutParams("/home", {
        searchParams: v.object({ tab: v.string() }),
      });
      const path = route.path({ tab: "dashboard" });
      expect(path).toBe("/home?tab=dashboard");
    });

    it("should handle no search params", () => {
      const route = createRouteWithoutParams("/home");
      expect(route.path()).toBe("/home");
    });

    it("should generate path with hash", () => {
      const route = createRouteWithoutParams("/home");
      expect(route.path(undefined, "section")).toBe("/home#section");
    });

    it("should generate path with search params and hash", () => {
      const route = createRouteWithoutParams("/home", {
        searchParams: v.object({ tab: v.string() }),
      });
      const path = route.path({ tab: "dashboard" }, "content");
      expect(path).toBe("/home?tab=dashboard#content");
    });
  });

  describe("Link component", () => {
    it("should render link without params", () => {
      const route = createRouteWithoutParams("/home");
      render(
        <MemoryRouter>
          <route.Link>Home</route.Link>
        </MemoryRouter>,
      );

      const link = screen.getByText("Home");
      // @ts-expect-error - jest-dom matcher
      expect(link).toHaveAttribute("href", "/home");
    });

    it("should render link with search params", () => {
      const route = createRouteWithoutParams("/home", {
        searchParams: v.object({ tab: v.string() }),
      });
      const searchParams = { tab: "settings" };
      render(
        <MemoryRouter>
          <route.Link searchParams={searchParams}>Home</route.Link>
        </MemoryRouter>,
      );

      const link = screen.getByText("Home");
      expect(link.getAttribute("href")).toBe("/home?tab=settings");
    });

    it("should pass through props", () => {
      const route = createRouteWithoutParams("/home");
      render(
        <MemoryRouter>
          <route.Link className="nav-link" data-testid="home-link">
            Home
          </route.Link>
        </MemoryRouter>,
      );

      const link = screen.getByTestId("home-link");
      // @ts-expect-error - jest-dom matcher
      expect(link).toHaveClass("nav-link");
    });
  });

  describe("pattern property", () => {
    it("should expose the pattern", () => {
      const route = createRouteWithoutParams("/home");
      expect(route.pattern).toBe("/home");
    });
  });
});

describe("Edge cases", () => {
  it("should handle deep nesting", () => {
    const route = createRouteWithParams("/a/:a/b/:b/c/:c", {
      params: v.object({ a: v.string(), b: v.string(), c: v.string() }),
    });

    expect(route.path({ a: "1", b: "2", c: "3" })).toBe("/a/1/b/2/c/3");
  });

  it("should handle numeric-looking param values", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
    });
    expect(route.path({ id: "123" })).toBe("/users/123");
  });

  it("should handle complex search param arrays", () => {
    const route = createRouteWithParams("/items/:id", {
      params: v.object({ id: v.string() }),
      searchParams: v.object({
        categories: v.array(v.string()),
        tags: v.array(v.string()),
      }),
    });

    const path = route.path({ id: "1" }, { categories: ["frontend"], tags: ["js", "ts", "react"] });

    expect(path).toContain("tags=js&tags=ts&tags=react");
    expect(path).toContain("categories=frontend");
  });
});

function TestComponent({ route }: { route: any }) {
  const [searchParams] = route.useSearchParams();
  return (
    <div>
      <span data-testid="param-sort">{searchParams.sort || "none"}</span>
      <span data-testid="param-filter">{searchParams.filter || "none"}</span>
    </div>
  );
}

describe("useSearchParams", () => {
  it("should parse search params from URL", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
      searchParams: v.object({
        filter: v.optional(v.string()),
        sort: v.optional(v.string()),
      }),
    });

    const routes = [
      {
        element: <TestComponent route={route} />,
        path: "/users/:id",
      },
    ];
    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/123?sort=name&filter=active"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("param-sort").textContent).toBe("name");
    expect(screen.getByTestId("param-filter").textContent).toBe("active");
  });

  it("should return undefined for missing optional params", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
      searchParams: v.object({
        filter: v.optional(v.string()),
        sort: v.optional(v.string()),
      }),
    });

    const routes = [
      {
        element: <TestComponent route={route} />,
        path: "/users/:id",
      },
    ];
    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/123"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("param-sort").textContent).toBe("none");
    expect(screen.getByTestId("param-filter").textContent).toBe("none");
  });

  it("should parse single search param", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
      searchParams: v.object({
        filter: v.optional(v.string()),
        sort: v.optional(v.string()),
      }),
    });

    const routes = [
      {
        element: <TestComponent route={route} />,
        path: "/users/:id",
      },
    ];
    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/123?sort=date"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("param-sort").textContent).toBe("date");
    expect(screen.getByTestId("param-filter").textContent).toBe("none");
  });

  it("should work with createRouteWithoutParams", () => {
    const route = createRouteWithoutParams("/home", {
      searchParams: v.object({
        filter: v.optional(v.string()),
        sort: v.optional(v.string()),
      }),
    });

    const routes = [
      {
        element: <TestComponent route={route} />,
        path: "/home",
      },
    ];
    const router = createMemoryRouter(routes, {
      initialEntries: ["/home?sort=name"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("param-sort").textContent).toBe("name");
  });
});

describe("useParamsRaw error handling", () => {
  it("should return error for invalid params", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.pipe(v.string(), v.uuid()) }),
    });

    function TestComponent() {
      const [params, error] = route.useParamsRaw();
      return (
        <div>
          <span data-testid="params">{params ? params.id : "null"}</span>
          <span data-testid="error">{error ? "error" : "ok"}</span>
        </div>
      );
    }

    const routes = [{ element: <TestComponent />, path: "/users/:id" }];
    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/not-a-uuid"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("params").textContent).toBe("null");
    expect(screen.getByTestId("error").textContent).toBe("error");
  });

  it("should return data for valid params", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.pipe(v.string(), v.uuid()) }),
    });

    function TestComponent() {
      const [params, error] = route.useParamsRaw();
      return (
        <div>
          <span data-testid="params">{params?.id || "null"}</span>
          <span data-testid="error">{error ? "error" : "ok"}</span>
        </div>
      );
    }

    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const routes = [{ element: <TestComponent />, path: "/users/:id" }];
    const router = createMemoryRouter(routes, {
      initialEntries: [`/users/${validUuid}`],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("params").textContent).toBe(validUuid);
    expect(screen.getByTestId("error").textContent).toBe("ok");
  });
});

describe("useSearchParamsRaw error handling", () => {
  it("should ignore extra search params", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
      searchParams: v.object({ sort: v.optional(v.string()) }),
    });

    function TestComponent() {
      const { data, error } = route.useSearchParamsRaw();
      return (
        <div>
          <span data-testid="sort">{data?.sort || "none"}</span>
          <span data-testid="error">{error ? "error" : "ok"}</span>
        </div>
      );
    }

    const routes = [{ element: <TestComponent />, path: "/users/:id" }];
    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/123?sort=name&debug=true&extra=123"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("sort").textContent).toBe("name");
    expect(screen.getByTestId("error").textContent).toBe("ok");
  });

  it("should ignore invalid optional params", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
      searchParams: v.object({
        page: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
        sort: v.optional(v.string()),
      }),
    });

    function TestComponent() {
      const { data, error } = route.useSearchParamsRaw();
      return (
        <div>
          <span data-testid="page">{data?.page ?? "none"}</span>
          <span data-testid="sort">{data?.sort || "none"}</span>
          <span data-testid="error">{error ? "error" : "ok"}</span>
        </div>
      );
    }

    const routes = [{ element: <TestComponent />, path: "/users/:id" }];
    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/123?page=invalid&sort=name"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("page").textContent).toBe("none");
    expect(screen.getByTestId("sort").textContent).toBe("name");
    expect(screen.getByTestId("error").textContent).toBe("ok");
  });

  it("should error on invalid required params", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
      searchParams: v.object({
        page: v.pipe(v.string(), v.transform(Number), v.number()),
      }),
    });

    function TestComponent() {
      const { data, error } = route.useSearchParamsRaw();
      return (
        <div>
          <span data-testid="page">{data?.page ?? "none"}</span>
          <span data-testid="error">{error ? "error" : "ok"}</span>
        </div>
      );
    }

    const routes = [{ element: <TestComponent />, path: "/users/:id" }];
    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/123?page=invalid"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("page").textContent).toBe("none");
    expect(screen.getByTestId("error").textContent).toBe("error");
  });

  it("should return valid data for valid params", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
      searchParams: v.object({
        page: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
      }),
    });

    function TestComponent() {
      const { data, error } = route.useSearchParamsRaw();
      return (
        <div>
          <span data-testid="page">{data?.page ?? "none"}</span>
          <span data-testid="error">{error ? "error" : "ok"}</span>
        </div>
      );
    }

    const routes = [{ element: <TestComponent />, path: "/users/:id" }];
    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/123?page=5"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("page").textContent).toBe("5");
    expect(screen.getByTestId("error").textContent).toBe("ok");
  });
});

describe("useParams redirect on error", () => {
  it("should redirect to errorRedirect URL on validation error", () => {
    const route = createRouteWithParams("/users/:id", {
      errorRedirect: "/404",
      params: v.object({ id: v.pipe(v.string(), v.uuid()) }),
    });

    function TestComponent() {
      const params = route.useParams();
      return <div data-testid="user-id">{params.id}</div>;
    }

    const routes = [
      { element: <TestComponent />, path: "/users/:id" },
      { element: <div data-testid="not-found">404</div>, path: "/404" },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/invalid-uuid"],
    });

    render(<RouterProvider router={router} />);

    // @ts-expect-error - jest-dom matcher
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });

  it("should not redirect for valid params", () => {
    const route = createRouteWithParams("/users/:id", {
      errorRedirect: "/404",
      params: v.object({ id: v.pipe(v.string(), v.uuid()) }),
    });

    function TestComponent() {
      const params = route.useParams();
      return <div data-testid="user-id">{params.id}</div>;
    }

    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const routes = [
      { element: <TestComponent />, path: "/users/:id" },
      { element: <div data-testid="not-found">404</div>, path: "/404" },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: [`/users/${validUuid}`],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("user-id").textContent).toBe(validUuid);
  });
});

describe("useSearchParams redirect on error", () => {
  it("should redirect on invalid required search params", () => {
    const route = createRouteWithParams("/users/:id", {
      errorRedirect: "/error",
      params: v.object({ id: v.string() }),
      searchParams: v.object({
        page: v.pipe(v.string(), v.transform(Number), v.number()),
      }),
    });

    function TestComponent() {
      const [searchParams] = route.useSearchParams();
      return <div data-testid="page">{searchParams.page}</div>;
    }

    const routes = [
      { element: <TestComponent />, path: "/users/:id" },
      { element: <div data-testid="error-page">Error</div>, path: "/error" },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/123?page=invalid"],
    });

    render(<RouterProvider router={router} />);

    // @ts-expect-error - jest-dom matcher
    expect(screen.getByTestId("error-page")).toBeInTheDocument();
  });

  it("should not redirect for valid search params", () => {
    const route = createRouteWithParams("/users/:id", {
      errorRedirect: "/error",
      params: v.object({ id: v.string() }),
      searchParams: v.object({
        page: v.pipe(v.string(), v.transform(Number), v.number()),
      }),
    });

    function TestComponent() {
      const [searchParams] = route.useSearchParams();
      return <div data-testid="page">{searchParams.page}</div>;
    }

    const routes = [
      { element: <TestComponent />, path: "/users/:id" },
      { element: <div data-testid="error-page">Error</div>, path: "/error" },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/123?page=5"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("page").textContent).toBe("5");
  });
});

describe("setGlobalErrorRedirect", () => {
  it("should use global error redirect if route-level not specified", () => {
    setGlobalErrorRedirect("/global-error");

    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.pipe(v.string(), v.uuid()) }),
    });

    function TestComponent() {
      const params = route.useParams();
      return <div data-testid="user-id">{params.id}</div>;
    }

    const routes = [
      { element: <TestComponent />, path: "/users/:id" },
      { element: <div data-testid="global-error">Global Error</div>, path: "/global-error" },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/invalid"],
    });

    render(<RouterProvider router={router} />);

    // @ts-expect-error - jest-dom matcher
    expect(screen.getByTestId("global-error")).toBeInTheDocument();
  });

  it("should prioritize route-level over global", () => {
    setGlobalErrorRedirect("/global-error");

    const route = createRouteWithParams("/users/:id", {
      errorRedirect: "/route-error",
      params: v.object({ id: v.pipe(v.string(), v.uuid()) }),
    });

    function TestComponent() {
      const params = route.useParams();
      return <div data-testid="user-id">{params.id}</div>;
    }

    const routes = [
      { element: <TestComponent />, path: "/users/:id" },
      { element: <div data-testid="route-error">Route Error</div>, path: "/route-error" },
      { element: <div data-testid="global-error">Global Error</div>, path: "/global-error" },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/invalid"],
    });

    render(<RouterProvider router={router} />);

    // @ts-expect-error - jest-dom matcher
    expect(screen.getByTestId("route-error")).toBeInTheDocument();
  });

  it("should use default '/' if neither global nor route-level specified", () => {
    setGlobalErrorRedirect("/");

    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.pipe(v.string(), v.uuid()) }),
    });

    function TestComponent() {
      const params = route.useParams();
      return <div data-testid="user-id">{params.id}</div>;
    }

    const routes = [
      { element: <TestComponent />, path: "/users/:id" },
      { element: <div data-testid="home">Home</div>, path: "/" },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ["/users/invalid"],
    });

    render(<RouterProvider router={router} />);

    // @ts-expect-error - jest-dom matcher
    expect(screen.getByTestId("home")).toBeInTheDocument();
  });
});

describe("optionalSearchParams", () => {
  it("should make all fields optional", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
      searchParams: optionalSearchParams({
        filter: v.string(),
        page: v.pipe(v.string(), v.transform(Number), v.number()),
        sort: v.string(),
      }),
    });

    // Should work without any search params
    expect(route.path({ id: "123" })).toBe("/users/123");

    // Should work with some search params
    expect(route.path({ id: "123" }, { filter: "active" })).toBe("/users/123?filter=active");

    // Should work with all search params
    const path = route.path({ id: "123" }, { filter: "active", page: 2, sort: "name" });
    expect(path).toContain("/users/123?");
    expect(path).toContain("filter=active");
    expect(path).toContain("page=2");
    expect(path).toContain("sort=name");
  });

  it("should work with useSearchParams hook", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
      searchParams: optionalSearchParams({
        filter: v.string(),
        sort: v.string(),
      }),
    });

    function TestComponent() {
      const [searchParams] = route.useSearchParams();
      return (
        <div>
          <div data-testid="filter">{searchParams.filter ?? "none"}</div>
          <div data-testid="sort">{searchParams.sort ?? "none"}</div>
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={["/users/123?filter=active&sort=name"]}>
        <TestComponent />
      </MemoryRouter>,
    );

    // @ts-expect-error - jest-dom matcher
    expect(screen.getByTestId("filter")).toHaveTextContent("active");
    // @ts-expect-error - jest-dom matcher
    expect(screen.getByTestId("sort")).toHaveTextContent("name");
  });

  it("should handle missing optional params gracefully", () => {
    const route = createRouteWithParams("/users/:id", {
      params: v.object({ id: v.string() }),
      searchParams: optionalSearchParams({
        filter: v.string(),
        sort: v.string(),
      }),
    });

    function TestComponent() {
      const [searchParams] = route.useSearchParams();
      return (
        <div>
          <div data-testid="filter">{searchParams.filter ?? "none"}</div>
          <div data-testid="sort">{searchParams.sort ?? "none"}</div>
        </div>
      );
    }

    // No search params provided
    render(
      <MemoryRouter initialEntries={["/users/123"]}>
        <TestComponent />
      </MemoryRouter>,
    );

    // @ts-expect-error - jest-dom matcher
    expect(screen.getByTestId("filter")).toHaveTextContent("none");
    // @ts-expect-error - jest-dom matcher
    expect(screen.getByTestId("sort")).toHaveTextContent("none");
  });

  it("should work with createRouteWithoutParams", () => {
    const route = createRouteWithoutParams("/home", {
      searchParams: optionalSearchParams({
        tab: v.string(),
        view: v.string(),
      }),
    });

    expect(route.path()).toBe("/home");
    expect(route.path({ tab: "settings" })).toBe("/home?tab=settings");
    expect(route.path({ tab: "settings", view: "grid" })).toContain("/home?");
  });
});
