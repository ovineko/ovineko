import type { LinkProps as LinkPropsLib, NavigateOptions } from "react-router";

import type * as v from "valibot";

export type InferSearchParams<T> = T extends v.GenericSchema ? v.InferOutput<T> : undefined;

export interface LinkPropsWithoutParams<SearchParams> extends Omit<LinkPropsLib, "to"> {
  children: React.ReactNode | string;
  className?: string;
  searchParams?: SearchParams;
  state?: State;
  style?: React.CSSProperties;
}

export interface LinkPropsWithParams<
  Params,
  SearchParams,
> extends LinkPropsWithoutParams<SearchParams> {
  params: Params;
}

export interface RouteBase {
  pattern: string;
}

export interface RouteWithoutParams<SearchParams = undefined> extends RouteBase {
  Link: (props: LinkPropsWithoutParams<SearchParams>) => React.ReactNode;
  path: (searchParams?: SearchParams, hash?: string) => string;
  useSearchParams: SearchParamsHook<SearchParams>;
  useSearchParamsRaw: SearchParamsHook<SearchParams> extends undefined
    ? undefined
    : () => UseSearchParamsRawResult<SearchParams>;
}

export interface RouteWithParams<Params, SearchParams = undefined> extends RouteBase {
  Link: (props: LinkPropsWithParams<Params, SearchParams>) => React.ReactNode;
  parseURLParams: (url: string) => Params;
  path: (params: Params, searchParams?: SearchParams, hash?: string) => string;
  useParams: () => Readonly<Params>;
  useParamsRaw: () => UseParamsRawResult<Params>;
  useSearchParams: SearchParamsHook<SearchParams>;
  useSearchParamsRaw: SearchParamsHook<SearchParams> extends undefined
    ? undefined
    : () => UseSearchParamsRawResult<SearchParams>;
}

export type SearchParamsHook<SearchParams> = SearchParams extends undefined
  ? undefined
  : () => readonly [Readonly<SearchParams>, SetSearchParams<SearchParams>];

export type SearchParamsInput = Record<string, string | string[]>;

export type SetSearchParams<SearchParams> = (
  nextInit: ((prev: Readonly<SearchParams>) => SearchParams) | SearchParams,
  navigateOpts?: NavigateOptions,
) => void;

export interface State {
  prevPath?: string;
  scrollTop?: number;
}

export type UseParamsRawResult<Params> = readonly [
  Readonly<Params> | undefined,
  undefined | v.BaseIssue<unknown>[],
];

export interface UseSearchParamsRawResult<SearchParams> {
  data: Readonly<SearchParams> | undefined;
  error: undefined | v.BaseIssue<unknown>[];
  setter: SetSearchParams<SearchParams>;
}
