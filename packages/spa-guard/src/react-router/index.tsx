// import { ErrorBoundary } from "react-error-boundary"
import { useRouteError } from "react-router";

export const ErrorBoundaryReactRouter = () => {
  const error = useRouteError();

  return <div>{JSON.stringify(error)}</div>;
};
