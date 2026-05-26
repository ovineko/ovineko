import { Navigate, Outlet } from "react-router";

import type { GuardResult } from "./types";

export interface GuardedRouteProps {
  /** Optional loading fallback shown while isLoading is true.
   *  When omitted, renders <Outlet /> immediately (allows parallel lazy loading). */
  loadingFallback?: React.ReactNode;
  /** A React hook that returns GuardResult. Called inside the component. */
  useGuard: () => GuardResult;
}

export function GuardedRoute({ loadingFallback, useGuard }: GuardedRouteProps) {
  const { allowed, isLoading, redirectTo } = useGuard();

  if (!isLoading && !allowed) {
    return <Navigate replace to={redirectTo} />;
  }

  if (isLoading && loadingFallback) {
    return loadingFallback;
  }

  return <Outlet />;
}
