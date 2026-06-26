import { defineConfig } from "./.datamitsu/cspell.config.mjs";

export default defineConfig((prev) => {
  const words = [
    "postpack",
    "uncompilable",
    "misrouted",
    "zstd",
    "deduplification",
    "unsub",
    "behaviour",
    "Consolas",
    "Menlo",
    "metas",
    "CHUNKLOADERROR",
    "unstub",
    "chunkloaderror",
    "stylescriptbad",
    "redbodydisplay",
    "redcolor",
    "reddisplay",
    "fffbodydisplay",
    "srcs",
    "dedup",
    "unsubscribers",
    "normalise",
    "frontmatter",
    "llms",
    "npmx",
    "llmstxt",
    "langium",
    "neko",
    "ovis",
    "opengraph",
    "umami",
    "XZZKYU",
    "bierner",
  ];

  return {
    ...prev,
    words: [...(prev.words || []), ...words],
  };
});
