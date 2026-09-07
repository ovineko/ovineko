const CODE_EXTENSIONS = /(?:^|\/)[^/]+\.(?:js|mjs|cjs|css)$/i;
const CODE_RESOURCE_TYPES = new Set(["document", "script", "style", "worker"]);
const NON_CODE_RESOURCE_TYPES = new Set(["audio", "fetch", "font", "image", "track", "video"]);

const getAttribute = (target: unknown, name: "as" | "href" | "rel"): string | undefined => {
  if (!target || (typeof target !== "object" && typeof target !== "function")) {
    return undefined;
  }

  const value = target as {
    [key: string]: unknown;
    getAttribute?: (attribute: string) => unknown;
  };

  try {
    const attribute = value.getAttribute?.(name);
    if (typeof attribute === "string") {
      return attribute;
    }
  } catch {}

  return typeof value[name] === "string" ? value[name] : undefined;
};

const hasRelation = (relations: string[], relation: string): boolean =>
  relations.includes(relation);

const hasCodeExtension = (url: string | undefined): boolean => {
  if (!url) {
    return false;
  }
  const withoutQueryOrFragment = url.split(/[?#]/, 1)[0] ?? "";
  return CODE_EXTENSIONS.test(withoutQueryOrFragment);
};

export const isCodeResource = (target: unknown): boolean => {
  if (!target || (typeof target !== "object" && typeof target !== "function")) {
    return false;
  }

  const element = target as { tagName?: unknown };
  if (typeof element.tagName !== "string") {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  if (tagName === "script") {
    return true;
  }
  if (tagName !== "link") {
    return false;
  }

  const relations = (getAttribute(target, "rel") ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const resourceType = getAttribute(target, "as")?.trim().toLowerCase();

  if (resourceType && NON_CODE_RESOURCE_TYPES.has(resourceType)) {
    return false;
  }
  if (hasRelation(relations, "stylesheet") || hasRelation(relations, "modulepreload")) {
    return true;
  }
  if (
    hasRelation(relations, "icon") ||
    hasRelation(relations, "apple-touch-icon") ||
    hasRelation(relations, "manifest") ||
    hasRelation(relations, "preconnect") ||
    hasRelation(relations, "dns-prefetch")
  ) {
    return false;
  }
  if (hasRelation(relations, "preload") || hasRelation(relations, "prefetch")) {
    if (resourceType && CODE_RESOURCE_TYPES.has(resourceType)) {
      return true;
    }
    if (resourceType) {
      return false;
    }
  }

  return hasCodeExtension(getAttribute(target, "href"));
};
