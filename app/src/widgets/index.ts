// Import every widget module so its register() call runs — this is the
// bundle entry point's dependency root for the bundle-size exercise.
import "./alert/alert.js";
import "./badge/badge.js";

export { listWidgets, create } from "../core/registry.js";
