import { escapeHtml } from "../../core/escape-html.js";
import { register, type WidgetProps } from "../../core/registry.js";

export interface AlertProps extends WidgetProps {
  message: string;
  tone?: "info" | "warn" | "error";
}

export function createAlert(props: AlertProps): string {
  const tone = props.tone === "warn" || props.tone === "error" ? props.tone : "info";
  return `<div class="alert alert--${tone}">${escapeHtml(props.message)}</div>`;
}

register("alert", createAlert);