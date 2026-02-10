import type { ReactElement } from "react";
import { createMemoryRouter, type RouteObject, RouterProvider } from "react-router";

import { render, type RenderOptions } from "@testing-library/react";

interface RenderWithRouterOptions extends Omit<RenderOptions, "wrapper"> {
  path?: string;
  route?: string;
  routes?: RouteObject[];
}

export function renderWithRouter(
  ui: ReactElement,
  { path = "/", route = "/", routes, ...renderOptions }: RenderWithRouterOptions = {},
) {
  const routeConfig: RouteObject[] = routes || [{ element: ui, path }];
  const router = createMemoryRouter(routeConfig, { initialEntries: [route] });
  return { ...render(<RouterProvider router={router} />, renderOptions), router };
}
