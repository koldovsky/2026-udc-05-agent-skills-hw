#!/usr/bin/env node

/**
 * Analyze the widget-registry bundle to understand size composition.
 * 
 * Usage:
 *   node scripts/analyze-bundle.mjs
 * 
 * Reads dist/bundle.js and reports:
 * - Total minified size
 * - Registered widgets (parsed from register() calls)
 * - Estimated per-widget contribution
 */

import fs from "fs";
import path from "path";

function analyzeBundle() {
  const bundlePath = path.join(process.cwd(), "dist", "bundle.js");

  if (!fs.existsSync(bundlePath)) {
    console.error(`Bundle not found at ${bundlePath}`);
    console.error("Run 'npm run build' first");
    process.exit(1);
  }

  const bundle = fs.readFileSync(bundlePath, "utf-8");
  const stats = fs.statSync(bundlePath);

  // Parse register() calls to find registered widgets
  const registerPattern = /register\s*\(\s*["']([^"']+)["']/g;
  const widgets = [];
  let match;

  while ((match = registerPattern.exec(bundle)) !== null) {
    widgets.push(match[1]);
  }

  // Report
  console.log("=== Widget-Registry Bundle Analysis ===\n");
  console.log(`Bundle path: ${bundlePath}`);
  console.log(`Minified size: ${stats.size} bytes\n`);

  if (widgets.length === 0) {
    console.log("No widgets found in bundle");
  } else {
    console.log(`Registered widgets: ${widgets.length}`);
    widgets.forEach((widget) => {
      console.log(`  - ${widget}`);
    });

    // Rough per-widget estimate (divide total by widget count + base registry overhead)
    const baseOverhead = 500; // Rough estimate for registry + imports
    const perWidget = Math.max(1, Math.round((stats.size - baseOverhead) / widgets.length));

    console.log(`\nRough per-widget contribution: ~${perWidget} bytes`);
    console.log(`(This is a rough estimate. Actual size varies by widget complexity.)\n`);
  }

  console.log("Tip: To see size changes, run 'npm run build' before and after");
  console.log("modifying widgets, then run this script to re-analyze.\n");
}

analyzeBundle();
