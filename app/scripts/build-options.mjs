// The one description of how app/ is bundled. `build.mjs` writes the artefact
// with it; `ablate.mjs` rebuilds the same graph in memory with widgets removed.
// Both import this object, so the two builds cannot drift apart by editing one
// and forgetting the other.
export const BUILD_OPTIONS = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  format: "esm",
  platform: "neutral",
};

export const OUTFILE = "dist/bundle.js";
