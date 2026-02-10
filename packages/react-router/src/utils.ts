import * as v from "valibot";

import type { SearchParamsInput } from "./types";

import { safeDecodeURIComponent, URLParseError } from "./validation";

export const queryParamsToString = (params?: SearchParamsInput): string => {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return "";
  }

  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((el) => {
        if (el !== undefined && el !== null) {
          query.append(key, String(el));
        }
      });
      return;
    }

    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

export const searchParamsToObject = (
  params: URLSearchParams,
): Record<string, string | string[]> => {
  const obj: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    obj[key] = values.length > 1 ? values : values[0]!;
  }
  return obj;
};

export const objectToSearchParams = (obj: Record<string, unknown>): URLSearchParams => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          params.append(key, String(item));
        }
      });
    } else {
      params.set(key, String(value));
    }
  }
  return params;
};

export const parseURLParamsRaw = (pattern: string, url: string): Record<string, string> => {
  let pathname: string;

  try {
    pathname = new URL(url).pathname;
  } catch {
    throw new URLParseError(`Invalid URL: "${url}"`, { pattern, url });
  }

  const urlParts = pathname.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  const params: Record<string, string> = {};

  for (const [i, patternPart] of patternParts.entries()) {
    const urlValue = urlParts[i];

    if (patternPart.startsWith(":")) {
      const paramKey = patternPart.slice(1);

      if (!urlValue) {
        throw new URLParseError(`Missing required parameter "${paramKey}" in URL "${pathname}"`, {
          paramKey,
          pathname,
          pattern,
          url,
        });
      }

      params[paramKey] = safeDecodeURIComponent(urlValue);
    } else if (patternPart !== urlValue) {
      throw new URLParseError(
        `URL path "${pathname}" doesn't match pattern "${pattern}": expected "${patternPart}" at position ${i}, got "${urlValue}"`,
        { actual: urlValue, expected: patternPart, pathname, pattern, position: i, url },
      );
    }
  }

  return params;
};

/**
 * Filters an object to only include keys that exist in the valibot object schema.
 * Ignores extra query parameters not defined in the schema.
 */
export const filterBySchemaKeys = <T extends v.ObjectSchema<any, any>>(
  obj: Record<string, unknown>,
  schema: T,
): Record<string, unknown> => {
  const entries = schema.entries;
  const filtered: Record<string, unknown> = {};

  for (const key in entries) {
    if (key in obj) {
      filtered[key] = obj[key];
    }
  }

  return filtered;
};

/**
 * Removes invalid optional parameters from an object.
 * Optional parameters with invalid values are ignored (treated as undefined).
 * Required parameters are kept as-is for subsequent validation.
 */
export const cleanOptionalParams = <T extends v.ObjectSchema<any, any>>(
  obj: Record<string, unknown>,
  schema: T,
): Record<string, unknown> => {
  const entries = schema.entries;
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fieldSchema = entries[key];
    if (fieldSchema) {
      const isOptional = fieldSchema.type === "optional";

      if (isOptional) {
        const result = v.safeParse(fieldSchema, value);
        if (result.success) {
          cleaned[key] = value;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }

  return cleaned;
};
