import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const appDir = path.join(repoRoot, "app");
const bundlePath = path.join(appDir, "dist", "bundle.js");

console.log("Building app bundle...");

execSync("npm run build", {
  cwd: appDir,
  stdio: "inherit",
});

const { size } = statSync(bundlePath);

console.log(`Bundle: ${bundlePath}`);
console.log(`Bundle size: ${size} bytes`);
console.log(`Bundle size: ${(size / 1024).toFixed(2)} KiB`);