import type { PluginConfig } from "@docusaurus/types";

export function appendArray<T>(existing: T[] | undefined, toAdd: T[]): T[] | undefined {
  if (toAdd.length === 0) {
    return existing;
  }
  return [...(existing ?? []), ...toAdd];
}

export function appendPlugins(existing: PluginConfig[], toAdd: PluginConfig[]): PluginConfig[] {
  const existingIds = new Set(
    existing.map((plugin) => getPluginIdentity(plugin)).filter(Boolean) as string[],
  );

  const filtered = toAdd.filter((p) => {
    const id = getPluginIdentity(p);
    return !id || !existingIds.has(id);
  });

  return [...existing, ...filtered];
}

export function getPluginIdentity(plugin: PluginConfig): null | string {
  if (typeof plugin === "string") {
    return plugin;
  }
  if (Array.isArray(plugin) && typeof plugin[0] === "string") {
    return plugin[0];
  }
  if (typeof plugin === "function") {
    return plugin.name || null;
  }
  if (Array.isArray(plugin) && typeof plugin[0] === "function") {
    return plugin[0].name || null;
  }
  return null;
}
