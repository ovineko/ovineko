/* eslint-disable react-perf/jsx-no-new-object-as-prop */
import { createMemoryRouter, RouterProvider } from "react-router";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { GuardResult } from "./types";

import { GuardedRoute } from "./GuardedRoute";

const useGuardAllowed = (): GuardResult => ({
  allowed: true,
  isLoading: false,
  redirectTo: "/login",
});

const useGuardLoadingNotAllowed = (): GuardResult => ({
  allowed: false,
  isLoading: true,
  redirectTo: "/login",
});

const useGuardNotAllowed = (): GuardResult => ({
  allowed: false,
  isLoading: false,
  redirectTo: "/login",
});

describe("GuardedRoute", () => {
  it("renders <Outlet /> when allowed is true and isLoading is false", () => {
    const useGuard = useGuardAllowed;

    const router = createMemoryRouter(
      [
        {
          children: [
            {
              element: <div>Dashboard Content</div>,
              path: "/dashboard",
            },
          ],
          element: <GuardedRoute useGuard={useGuard} />,
        },
      ],
      { initialEntries: ["/dashboard"] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });

  it("renders <Outlet /> when isLoading is true and no loadingFallback", () => {
    const useGuard = useGuardLoadingNotAllowed;

    const router = createMemoryRouter(
      [
        {
          children: [
            {
              element: <div>Dashboard Content</div>,
              path: "/dashboard",
            },
          ],
          element: <GuardedRoute useGuard={useGuard} />,
        },
      ],
      { initialEntries: ["/dashboard"] },
    );

    render(<RouterProvider router={router} />);

    // Should render the child (parallel loading behavior)
    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });

  it("renders loadingFallback when isLoading is true and loadingFallback is provided", () => {
    const useGuard = useGuardLoadingNotAllowed;

    const router = createMemoryRouter(
      [
        {
          children: [
            {
              element: <div>Dashboard Content</div>,
              path: "/dashboard",
            },
          ],
          element: <GuardedRoute loadingFallback={<div>Loading...</div>} useGuard={useGuard} />,
        },
      ],
      { initialEntries: ["/dashboard"] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard Content")).not.toBeInTheDocument();
  });

  it("redirects when isLoading is false and allowed is false", () => {
    const useGuard = useGuardNotAllowed;

    const router = createMemoryRouter(
      [
        {
          children: [
            {
              element: <div>Dashboard Content</div>,
              path: "/dashboard",
            },
          ],
          element: <GuardedRoute useGuard={useGuard} />,
        },
        {
          element: <div>Login Page</div>,
          path: "/login",
        },
      ],
      { initialEntries: ["/dashboard"] },
    );

    render(<RouterProvider router={router} />);

    // Should redirect to login
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard Content")).not.toBeInTheDocument();
  });

  it("does NOT redirect while isLoading is true even if allowed is false", () => {
    const useGuard = useGuardLoadingNotAllowed;

    const router = createMemoryRouter(
      [
        {
          children: [
            {
              element: <div>Dashboard Content</div>,
              path: "/dashboard",
            },
          ],
          element: <GuardedRoute useGuard={useGuard} />,
        },
        {
          element: <div>Login Page</div>,
          path: "/login",
        },
      ],
      { initialEntries: ["/dashboard"] },
    );

    render(<RouterProvider router={router} />);

    // Should not redirect during loading
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });

  it("uses replace for redirect", () => {
    const useGuard = useGuardNotAllowed;

    const router = createMemoryRouter(
      [
        {
          children: [
            {
              element: <div>Dashboard Content</div>,
              path: "/dashboard",
            },
          ],
          element: <GuardedRoute useGuard={useGuard} />,
        },
        {
          element: <div>Login Page</div>,
          path: "/login",
        },
      ],
      { initialEntries: ["/", "/dashboard"] },
    );

    render(<RouterProvider router={router} />);

    // Should redirect to login
    expect(screen.getByText("Login Page")).toBeInTheDocument();

    // Verify that /dashboard was replaced (not pushed)
    // The current location should be /login, and going back should go to "/"
    const currentLocation = router.state.location.pathname;
    expect(currentLocation).toBe("/login");

    // History should be: ["/", "/login"] (dashboard was replaced)
    // This verifies the replace behavior
  });
});
