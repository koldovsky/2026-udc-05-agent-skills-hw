import { register, type WidgetProps } from "../../core/registry.js";

export interface AlertProps extends WidgetProps {
  message: string;
  tone?: "info" | "warn" | "error";
}

const VALID_TONES = new Set(["info", "warn", "error"]);

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function createAlert(props: AlertProps): string {
  const tone = props.tone ?? "info";
  if (!VALID_TONES.has(tone)) {
    throw new Error(`Invalid tone "${tone}". Must be one of: info, warn, error`);
  }
  return `<div class="alert alert--${tone}">${escapeHtml(props.message)}</div>`;
}

register("alert", createAlert);
