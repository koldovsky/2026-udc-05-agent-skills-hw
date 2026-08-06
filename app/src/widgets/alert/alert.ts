import { register, type WidgetProps } from "../../core/registry.js";
import { escapeHtml } from "../../core/escapeHtml.js";

export interface AlertProps extends WidgetProps {
  message: string;
  tone?: "info" | "warn" | "error";
}

const ALLOWED_TONES = new Set(["info", "warn", "error"]);

export function createAlert(props: AlertProps): string {
  if (typeof props.message !== "string") {
    throw new TypeError('Alert "message" must be a string');
  }
  const tone = props.tone ?? "info";
  if (!ALLOWED_TONES.has(tone)) {
    throw new TypeError('Alert "tone" must be one of "info" | "warn" | "error"');
  }
  return `<div class="alert alert--${tone}">${escapeHtml(props.message)}</div>`;
}

register("alert", createAlert);
