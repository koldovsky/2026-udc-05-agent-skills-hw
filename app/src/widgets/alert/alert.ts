import { register, type WidgetProps } from "../../core/registry.js";

export interface AlertProps extends WidgetProps {
  message: string;
  tone?: "info" | "warn" | "error";
}

const TONES = new Set(["info", "warn", "error"]);
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

export function createAlert(props: AlertProps): string {
  if (typeof props.message !== "string") {
    throw new TypeError(`createAlert: "message" must be a string, got ${typeof props.message}`);
  }
  const tone = props.tone && TONES.has(props.tone) ? props.tone : "info";
  return `<div class="alert alert--${tone}">${escapeHtml(props.message)}</div>`;
}

register("alert", createAlert);
