import { register, type WidgetProps } from "../../core/registry.js";

export interface AlertProps extends WidgetProps {
  message: string;
  tone?: "info" | "warn" | "error";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createAlert(props: AlertProps): string {
  if (typeof props.message !== "string") {
    throw new Error("Alert message must be a string");
  }

  const tone = props.tone ?? "info";
  if (tone !== "info" && tone !== "warn" && tone !== "error") {
    throw new Error(`Invalid alert tone "${String(tone)}"`);
  }

  return `<div class="alert alert--${tone}">${escapeHtml(props.message)}</div>`;
}

register("alert", createAlert);
