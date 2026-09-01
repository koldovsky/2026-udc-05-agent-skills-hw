// Import every widget module so its register() call runs — this is the
// bundle entry point's dependency root for the bundle-size exercise.
import "./badge/badge.js";
import "./alert/alert.js";

export { listWidgets, create } from "../core/registry.js";
