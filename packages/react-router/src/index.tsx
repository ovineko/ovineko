import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import type { NavigateOptions } from "react-router";
import {
  generatePath,
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";

import * as v from "valibot";

import type {
  InferSearchParams,
  LinkPropsWithoutParams,
  LinkPropsWithParams,
  RouteWithoutParams,
  RouteWithParams,
  SearchParamsInput,
  SetSearchParams,
  State,
  UseParamsRawResult,
  UseSearchParamsRawResult,
} from "./types";

import {
  cleanOptionalParams,
  filterBySchemaKeys,
  objectToSearchParams,
  parseURLParamsRaw,
  searchParamsToObject,
  searchParamsToString,
} from "./utils";

// eslint-disable-next-line react-refresh/only-export-components
export { GuardedRoute } from "./GuardedRoute";
export type { GuardedRouteProps } from "./GuardedRoute";
export type {
  GuardResult,
  RouteBase,
  RouteWithoutParams,
  RouteWithParams,
  State,
  UseParamsRawResult,
  UseSearchParamsRawResult,
} from "./types";
// eslint-disable-next-line react-refresh/only-export-components
export { optionalSearchParams } from "./utils";

// eslint-disable-next-line react-refresh/only-export-components
export { URLParseError } from "./validation";

let globalErrorRedirect = "/";

// eslint-disable-next-line react-refresh/only-export-components
export const setGlobalErrorRedirect = (url: string): void => {
  globalErrorRedirect = url;
};

const getErrorRedirectUrl = (routeLevel?: string): string => {
  return routeLevel ?? globalErrorRedirect;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRedirect = (path: string, is: boolean, replace = true) => {
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (is && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigate(path, { replace });
    } else if (!is) {
      // Reset the ref when condition becomes false
      hasRedirectedRef.current = false;
    }
  }, [is, navigate, path, replace]);
};

const createSearchParamsHook = <TSchema extends v.GenericSchema>(schema: TSchema) => {
  type Output = v.InferOutput<TSchema>;

  const useSearchParamsRaw = (): UseSearchParamsRawResult<Output> => {
    const [rawSearchParams, setRawSearchParams] = useSearchParams();

    const { data, error } = useMemo(() => {
      const obj = searchParamsToObject(rawSearchParams);
      const filtered = filterBySchemaKeys(obj, schema as unknown as v.ObjectSchema<any, any>);
      const cleaned = cleanOptionalParams(filtered, schema as unknown as v.ObjectSchema<any, any>);
      const result = v.safeParse(schema, cleaned);

      if (result.success) {
        return { data: result.output as Output, error: undefined };
      }
      return { data: undefined, error: result.issues };
    }, [rawSearchParams]);

    const setter = useCallback(
      (nextInit: ((prev: Readonly<Output>) => Output) | Output, navigateOpts?: NavigateOptions) => {
        if (typeof nextInit === "function") {
          setRawSearchParams((prev) => {
            const prevObj = searchParamsToObject(prev);
            const filtered = filterBySchemaKeys(
              prevObj,
              schema as unknown as v.ObjectSchema<any, any>,
            );
            const cleaned = cleanOptionalParams(
              filtered,
              schema as unknown as v.ObjectSchema<any, any>,
            );
            const result = v.safeParse(schema, cleaned);
            const prevParsed = result.success ? result.output : ({} as Readonly<Output>);
            const nextObj = (nextInit as (prev: Readonly<Output>) => Output)(prevParsed);
            return objectToSearchParams(nextObj as Record<string, unknown>);
          }, navigateOpts);
        } else {
          setRawSearchParams(
            objectToSearchParams(nextInit as Record<string, unknown>),
            navigateOpts,
          );
        }
      },
      [setRawSearchParams],
    );

    return { data, error, setter };
  };

  const useSearchParamsHook = (
    errorRedirectUrl?: string,
  ): readonly [Readonly<Output>, SetSearchParams<Output>] => {
    const { data, error, setter } = useSearchParamsRaw();
    const redirectUrl = getErrorRedirectUrl(errorRedirectUrl);
    useRedirect(redirectUrl, Boolean(error));

    return [data ?? ({} as Readonly<Output>), setter] as const;
  };

  return { useSearchParamsHook, useSearchParamsRaw };
};

// eslint-disable-next-line react-refresh/only-export-components
export const createRouteWithParams = <
  TParams extends v.GenericSchema,
  TSearchParams extends undefined | v.GenericSchema = undefined,
>(
  pattern: string,
  config: { errorRedirect?: string; params: TParams; searchParams?: TSearchParams },
): Readonly<RouteWithParams<v.InferOutput<TParams>, InferSearchParams<TSearchParams>>> => {
  type Params = v.InferOutput<TParams>;
  type SearchParams = InferSearchParams<TSearchParams>;

  const getPath = (params: Params, searchParams?: SearchParams, hash?: string) =>
    `${generatePath(pattern, params as Record<string, string>)}${searchParamsToString(searchParams as SearchParamsInput | undefined)}${hash ? `#${hash}` : ""}`;

  const searchParamsHooks = config.searchParams
    ? createSearchParamsHook(config.searchParams)
    : null;

  const LinkComponent = memo(
    ({
      children,
      params,
      searchParams,
      state,
      ...props
    }: LinkPropsWithParams<Params, SearchParams>) => {
      const { pathname } = useLocation();
      const mergedState = useMemo<State>(
        () => ({ prevPath: pathname, ...state }),
        [pathname, state],
      );
      return (
        <Link {...props} state={mergedState} to={getPath(params, searchParams)}>
          {children}
        </Link>
      );
    },
  );

  const useParamsRaw = (): UseParamsRawResult<Params> => {
    const params = useParams();
    const result = v.safeParse(config.params, params);

    if (result.success) {
      return [result.output as Readonly<Params>, undefined] as const;
    }
    return [undefined, result.issues] as const;
  };

  const useParamsHook = (): Readonly<Params> => {
    const [params, error] = useParamsRaw();
    const redirectUrl = getErrorRedirectUrl(config.errorRedirect);
    useRedirect(redirectUrl, Boolean(error));

    return params ?? ({} as Readonly<Params>);
  };

  return {
    Link: LinkComponent,
    parseURLParams: (url: string) => {
      const rawParams = parseURLParamsRaw(pattern, url);
      return v.parse(config.params, rawParams);
    },
    path: getPath,
    pattern,
    useParams: useParamsHook,
    useParamsRaw,
    useSearchParams: searchParamsHooks
      ? () => searchParamsHooks.useSearchParamsHook(config.errorRedirect)
      : (undefined as any),
    useSearchParamsRaw: searchParamsHooks
      ? searchParamsHooks.useSearchParamsRaw
      : (undefined as any),
  } as RouteWithParams<Params, SearchParams>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const createRouteWithoutParams = <
  TSearchParams extends undefined | v.GenericSchema = undefined,
>(
  pattern: string,
  config?: { errorRedirect?: string; searchParams?: TSearchParams },
): Readonly<RouteWithoutParams<InferSearchParams<TSearchParams>>> => {
  type SearchParams = InferSearchParams<TSearchParams>;

  const getPath = (searchParams?: SearchParams, hash?: string) =>
    `${pattern}${searchParamsToString(searchParams as SearchParamsInput | undefined)}${hash ? `#${hash}` : ""}`;

  const searchParamsHooks = config?.searchParams
    ? createSearchParamsHook(config.searchParams)
    : null;

  const LinkComponent = memo(
    ({ children, searchParams, state, ...props }: LinkPropsWithoutParams<SearchParams>) => {
      const { pathname } = useLocation();
      const mergedState = useMemo<State>(
        () => ({ prevPath: pathname, ...state }),
        [pathname, state],
      );
      return (
        <Link {...props} state={mergedState} to={getPath(searchParams)}>
          {children}
        </Link>
      );
    },
  );

  return {
    Link: LinkComponent,
    path: getPath,
    pattern,
    useSearchParams: searchParamsHooks
      ? () => searchParamsHooks.useSearchParamsHook(config?.errorRedirect)
      : (undefined as any),
    useSearchParamsRaw: searchParamsHooks
      ? searchParamsHooks.useSearchParamsRaw
      : (undefined as any),
  } as RouteWithoutParams<SearchParams>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const replaceState = (state: State) => {
  if (!globalThis.window) {
    return;
  }

  globalThis.window.history.replaceState(
    {
      ...globalThis.window.history.state,
      usr: {
        ...globalThis.window.history.state?.usr,
        ...state,
      },
    },
    "",
  );
};
